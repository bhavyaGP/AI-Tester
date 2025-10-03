import fs from "fs";
import path from "path";
import jestPromptTemplate from "../prompts/jestPrompt.js";
import dbPromptTemplate from "../prompts/dbPrompt.js";
import controllerPromptTemplate from "../prompts/controllerPrompt.js";
import { ensureDir } from "../tools/pathUtils.js";
import { cleanGeneratedCode, validateGeneratedCode } from "../tools/codeCleanup.js";
import { mergeTestContents } from "../tools/testMergeUtils.js";
import { analyzeProjectStructure } from "../tools/projectAnalyzer.js";
import { ai } from "../config/aiconfig.js";

// Function to analyze code patterns for better test generation
function analyzeCodePatterns(fileContent) {
  const patterns = {
    errorHandling: [],
    responsePatterns: [],
    conditionalBranches: [],
    asyncOperations: [],
    exports: [],
    imports: [],
    models: [],
    isRoute: false,
    mongooseQueryChains: [],
    constructors: [],
    missingElseBranches: [],
    uncoveredEdgeCases: []
  };

  // Extract exports
  const exportMatches = fileContent.match(/export\s+(?:default\s+)?(?:function\s+)?(\w+)/g) || [];
  const moduleExportMatches = fileContent.match(/module\.exports\s*=\s*{([^}]*)}/g) || [];
  const directExportMatches = fileContent.match(/module\.exports\.(\w+)/g) || [];
  
  patterns.exports = [
    ...exportMatches.map(match => match.replace(/export\s+(?:default\s+)?(?:function\s+)?/, '')),
    ...moduleExportMatches.map(match => {
      const content = match.match(/{([^}]*)}/)?.[1] || '';
      return content.split(',').map(s => s.trim().replace(/[:"']/g, ''));
    }).flat(),
    ...directExportMatches.map(match => match.replace('module.exports.', ''))
  ].filter(Boolean);

  // Extract imports
  const requireMatches = fileContent.match(/const\s+.*?=\s+require\(["']([^"']+)["']\)/g) || [];
  const importMatches = fileContent.match(/import\s+.*?from\s+["']([^"']+)["']/g) || [];
  
  patterns.imports = [
    ...requireMatches.map(match => {
      const pathMatch = match.match(/require\(["']([^"']+)["']\)/);
      return pathMatch ? pathMatch[1] : '';
    }),
    ...importMatches.map(match => {
      const pathMatch = match.match(/from\s+["']([^"']+)["']/);
      return pathMatch ? pathMatch[1] : '';
    })
  ].filter(Boolean);

  // Detect Express routes
  if (/\bexpress\(|\brouter\.get\b|\brouter\.post\b|\bapp\.get\b|\bapp\.post\b/.test(fileContent)) {
    patterns.isRoute = true;
  }

  // Extract model dependencies and detect Mongoose query chains
  patterns.models = patterns.imports
    .filter(imp => imp.includes('model') || imp.includes('/models/'))
    .map(imp => {
      const modelName = imp.split('/').pop().replace(/\.model(\.js)?$/, '');
      return modelName;
    });

  // Detect Mongoose chained queries like Model.find(...).sort(...).limit(...)
  const chainRegex = /(\w+)\.find\([^)]*\)(?:\s*\.\s*(\w+)\([^)]*\))+/g;
  let match;
  while ((match = chainRegex.exec(fileContent)) !== null) {
    const model = match[1];
    const methodsFound = [];
    const fullMatch = match[0];
    const methodMatches = fullMatch.matchAll(/\.(\w+)\(/g);
    for (const m of methodMatches) {
      methodsFound.push(m[1]);
    }
    patterns.mongooseQueryChains.push({ model, methods: methodsFound });
    if (!patterns.models.includes(model)) {
      patterns.models.push(model);
    }
  }

  // Detect constructors (new Model(...))
  const ctorRegex = /new\s+([A-Z]\w+)\s*\(/g;
  while ((match = ctorRegex.exec(fileContent)) !== null) {
    if (!patterns.constructors.includes(match[1])) {
      patterns.constructors.push(match[1]);
    }
    if (!patterns.models.includes(match[1])) {
      patterns.models.push(match[1]);
    }
  }

  // Extract error handling patterns
  const tryCatchMatches = fileContent.match(/try\s*{[\s\S]*?}\s*catch\s*\([^)]*\)\s*{[\s\S]*?}/g) || [];
  patterns.errorHandling = tryCatchMatches.map(match => {
    const catchBlock = match.match(/catch\s*\([^)]*\)\s*{([\s\S]*?)}/);
    return catchBlock ? catchBlock[1].trim() : '';
  });

  // Detect missing else branches (if without else)
  const ifWithoutElseRegex = /if\s*\([^)]*\)\s*{[^}]*}(?!\s*else)/g;
  while ((match = ifWithoutElseRegex.exec(fileContent)) !== null) {
    patterns.missingElseBranches.push(match[0]);
  }

  // Extract response patterns
  const responseMatches = fileContent.match(/res\.(?:status\(\d+\)\.)?(?:json|send)\([^)]*\)/g) || [];
  patterns.responsePatterns = responseMatches;

  // Extract conditional branches
  const ifMatches = fileContent.match(/if\s*\([^)]*\)\s*{[\s\S]*?}/g) || [];
  patterns.conditionalBranches = ifMatches.map(match => {
    const condition = match.match(/if\s*\(([^)]*)\)/);
    return condition ? condition[1].trim() : '';
  });

  // Extract async operations (await fn(...) or await obj.method(...))
  const asyncMatches = fileContent.match(/await\s+(?:[A-Za-z_$][\w$]*\s*\(|(?:[A-Za-z_$][\w$]*\.)+[A-Za-z_$][\w$]*\s*\()/g) || [];
  patterns.asyncOperations = asyncMatches;

  // Detect potential edge cases that might not be covered
  if (fileContent.includes('.length') && !fileContent.includes('if') && !fileContent.includes('?')) {
    patterns.uncoveredEdgeCases.push('Array/String length used without null/empty check');
  }
  if (fileContent.includes('JSON.parse') && !patterns.errorHandling.length) {
    patterns.uncoveredEdgeCases.push('JSON.parse without try-catch');
  }

  return patterns;
}

// Generate mock setup code based on detected patterns
function generateMockSetup(patterns) {
  let mockSetup = '';

  // Generate mocks for Mongoose query chains
  for (const chain of patterns.mongooseQueryChains) {
    const { model, methods } = chain;
    const mockQueryName = `mock${model}Query`;
    mockSetup += `\n// Mock ${model} query chain\nconst ${mockQueryName} = {\n`;
    
    for (const method of methods) {
      if (method === 'find') continue; // Skip find, we mock it separately
      // Methods like sort, limit, populate should return this for chaining
      if (['sort', 'limit', 'populate', 'select', 'skip'].includes(method)) {
        mockSetup += `  ${method}: jest.fn().mockReturnThis(),\n`;
      } else if (['exec', 'then'].includes(method)) {
        mockSetup += `  ${method}: jest.fn().mockResolvedValue([]),\n`;
      }
    }
    
    // Add default exec if not present
    if (!methods.includes('exec') && !methods.includes('then')) {
      mockSetup += `  exec: jest.fn().mockResolvedValue([]),\n`;
    }
    
    mockSetup += `};\n${model}.find = jest.fn().mockReturnValue(${mockQueryName});\n`;
  }

  // Generate mocks for constructors
  for (const constructor of patterns.constructors) {
    mockSetup += `\n// Mock ${constructor} constructor\n`;
    mockSetup += `${constructor}.mockImplementation((data) => ({\n`;
    mockSetup += `  ...data,\n`;
    mockSetup += `  save: jest.fn().mockResolvedValue(data),\n`;
    mockSetup += `}));\n`;
  }

  return mockSetup;
}

async function mainAgent(file, options = {}) {
  const { dryRun = false, focusExports = null } = options;
  if (!fs.existsSync(file)) {
    console.log(`⚠️ File ${file} does not exist. Skipping.`);
    return;
  }
  
  // Use dynamic project structure analysis
  const projectAnalyzer = analyzeProjectStructure();
  let fileContent = '';
  try {
    fileContent = fs.readFileSync(file, "utf8");
    
    // Truncate very large files to prevent API payload issues
    const maxFileSize = 15000; // Limit to 15000 chars
    if (fileContent.length > maxFileSize) {
      console.log(`⚠️ Large file detected (${fileContent.length} chars), truncating to ${maxFileSize} chars`);
      fileContent = fileContent.substring(0, maxFileSize) + '\n\n// ... (file truncated for API transmission)';
    }
  } catch (err) {
    console.error(`❌ Failed to read file ${file}:`, err?.message || err);
    throw new Error(`File read error: ${err?.message || err}`);
  }
  
  // Get dynamic test file path and import statements
  const testFilePath = projectAnalyzer.getTestFilePath(file);
  const importStatements = projectAnalyzer.generateImportStatements(testFilePath, file);
  
  // Ensure test directory exists
  ensureDir(path.dirname(testFilePath));

  // Analyze code patterns to provide better context
  const codePatterns = analyzeCodePatterns(fileContent);
  
  // Generate mock setup based on patterns
  const mockSetupCode = generateMockSetup(codePatterns);

  // Choose appropriate prompt based on file type
  let prompt;
  if (file.includes('db.js') || file.includes('database') || file.includes('connection')) {
    prompt = dbPromptTemplate(fileContent, importStatements.join('\n'));
  } else if (file.includes('controller') || file.includes('Controller')) {
    prompt = controllerPromptTemplate(fileContent, importStatements.join('\n'), codePatterns);
  } else {
    prompt = jestPromptTemplate(fileContent, importStatements.join('\n'));
  }

  console.log(`⚡ Generating tests for ${file}`);
  console.log(`📁 Test file: ${testFilePath}`);
  console.log(`📦 Project type: ${projectAnalyzer.structure.type}`);
  console.log(`📊 Detected patterns:`, {
    exports: codePatterns.exports,
    models: codePatterns.models.length,
    mongooseChains: codePatterns.mongooseQueryChains.length,
    constructors: codePatterns.constructors.length,
    responsePatterns: codePatterns.responsePatterns.length,
    conditionalBranches: codePatterns.conditionalBranches.length,
    asyncOperations: codePatterns.asyncOperations.length,
    isRoute: codePatterns.isRoute
  });

  let response;
  let retryCount = 0;
  const maxRetries = 3;
  const timeoutMs = 120000; // 120 seconds timeout (increased for complex test generation)
  
  while (retryCount < maxRetries) {
    try {
      // Wrap the API call with a timeout
      const apiCallPromise = ai.models.generateContent({
        model: 'gemini-2.5-flash',
        config: {
          temperature: 0.2,
        },
        contents: [
          {
            role: "user",
            parts: [{
              text: `You are a Senior Unit Tester specializing in Jest test generation. Your role is to create focused, high-quality unit tests that match the ACTUAL implementation patterns in the provided code. 

CRITICAL OUTPUT REQUIREMENTS:
- OUTPUT ONLY RAW JAVASCRIPT CODE
- NO MARKDOWN CODE BLOCKS (no \`\`\`javascript or \`\`\`)
- NO EXPLANATIONS OR COMMENTS OUTSIDE THE CODE
- NO INTRODUCTORY TEXT LIKE "Here's the test code:"
- START DIRECTLY WITH const, require, or jest statements
- END WITH THE LAST CLOSING BRACE OF THE TEST

CRITICAL ANALYSIS REQUIRED:
1. Analyze the actual code structure, error handling patterns, and response formats first
2. Generate tests ONLY for code paths that actually exist in the implementation
3. Match test expectations to the ACTUAL response patterns (res.status().json(), res.json(), etc.)
4. Test only realistic scenarios that can occur with the real code
5. Avoid over-testing theoretical edge cases that the code doesn't handle
6. Focus on achieving good coverage of the actual implemented code paths with tests that will actually pass

DYNAMIC MOCKING GUIDANCE:
${mockSetupCode ? `
Detected patterns require the following mock setup (use this in your beforeEach):
${mockSetupCode}
` : ''}
${codePatterns.isRoute ? `
ROUTE FILE DETECTED:
- This is an Express route file. Use supertest or manual req/res simulation.
- Mock all imported controllers before defining routes.
- Test by simulating HTTP requests and verifying controller calls.
- Example: const response = await request(app).post('/login').send({...});
` : ''}
${codePatterns.mongooseQueryChains.length > 0 ? `
MONGOOSE QUERY CHAINS DETECTED:
- Found ${codePatterns.mongooseQueryChains.length} chained queries (e.g., Model.find().sort().limit())
- Create mock query objects with chained methods returning 'this' or resolved values
- Example: const mockQuery = { sort: jest.fn().mockReturnThis(), exec: jest.fn().mockResolvedValue([]) };
- Then: Model.find.mockReturnValue(mockQuery);
` : ''}

DETECTED CODE PATTERNS:
- Exports: ${codePatterns.exports.join(', ')}
- Models: ${codePatterns.models.join(', ')}
- Constructors: ${codePatterns.constructors.join(', ')}
- Response patterns: ${codePatterns.responsePatterns.join(', ')}
- Conditional branches: ${codePatterns.conditionalBranches.length}
- Async operations: ${codePatterns.asyncOperations.length}
${codePatterns.missingElseBranches.length > 0 ? `- ⚠️ Missing else branches detected: ${codePatterns.missingElseBranches.length}` : ''}
${codePatterns.uncoveredEdgeCases.length > 0 ? `- ⚠️ Potential edge cases: ${codePatterns.uncoveredEdgeCases.join(', ')}` : ''}

PROJECT STRUCTURE INFO:
- Project type: ${projectAnalyzer.structure.type}
- Package type: ${projectAnalyzer.structure.packageType}
                - Generated import statements to use: ${importStatements.join('\n')}
                - Targeted exports to focus on (if provided): ${(focusExports && focusExports.length) ? focusExports.join(', ') : 'ALL'}

Use these patterns to generate accurate tests that match the actual implementation. Use the provided import statements EXACTLY as given. OUTPUT ONLY THE JEST TEST CODE - NO MARKDOWN, NO EXPLANATIONS.` }]
        },
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ],
    });
      
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('API request timed out')), timeoutMs)
      );
      
      // Race between API call and timeout
      response = await Promise.race([apiCallPromise, timeoutPromise]);
      
      // If successful, break out of retry loop
      console.log(`✅ AI generation successful for ${file}`);
      break;
      
    } catch (err) {
      retryCount++;
      const isTimeout = err?.message?.includes('timeout') || err?.message?.includes('timed out');
      
      if (retryCount >= maxRetries) {
                console.error(`❌ AI generation failed for ${file} after ${maxRetries} attempts:`, err?.message || err);
        throw new Error(`AI generation failed: ${err?.message || err}`);
        if (dryRun) {
          return { testFilePath, content: '' };
        }
        return testFilePath;
      }
      
      // Wait before retrying (exponential backoff)
      const waitTime = Math.min(1000 * Math.pow(2, retryCount - 1), 10000);
      console.log(`⚠️ ${isTimeout ? 'Timeout' : 'Error'} on attempt ${retryCount}/${maxRetries}. Retrying in ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  // Get the raw response
  let rawOutput = (response && ((response.message && response.message.content) || response.text)) || '';
  
  // Clean the generated code to remove markdown and explanations
  const cleanedOutput = cleanGeneratedCode(rawOutput);
  
  // Validate the cleaned code
  const issues = validateGeneratedCode(cleanedOutput);
  if (issues.length > 0) {
    console.log(`⚠️ Code cleanup issues found: ${issues.join(', ')}`);
    console.log(`📋 Raw output length: ${rawOutput.length}, Cleaned length: ${cleanedOutput.length}`);
  }
  
  if (dryRun) {
    return { testFilePath, content: cleanedOutput };
  }

  // Write or merge the cleaned code to file
  try {
    if (focusExports && Array.isArray(focusExports) && focusExports.length > 0 && fs.existsSync(testFilePath)) {
      const existing = fs.readFileSync(testFilePath, 'utf8');
      const merged = mergeTestContents(existing, cleanedOutput);
      fs.writeFileSync(testFilePath, merged);
    } else {
      fs.writeFileSync(testFilePath, cleanedOutput);
    }
  } catch (err) {
    console.error(`❌ Failed to write test file ${testFilePath}:`, err?.message || err);
    throw new Error(`File write error: ${err?.message || err}`);
  }
  return testFilePath;
}

export { mainAgent };
