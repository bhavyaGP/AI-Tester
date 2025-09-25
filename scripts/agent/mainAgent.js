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
    models: []
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

  // Extract model dependencies
  patterns.models = patterns.imports
    .filter(imp => imp.includes('model') || imp.includes('/models/'))
    .map(imp => {
      const modelName = imp.split('/').pop().replace(/\.model(\.js)?$/, '');
      return modelName;
    });

  // Extract error handling patterns
  const tryCatchMatches = fileContent.match(/try\s*{[\s\S]*?}\s*catch\s*\([^)]*\)\s*{[\s\S]*?}/g) || [];
  patterns.errorHandling = tryCatchMatches.map(match => {
    const catchBlock = match.match(/catch\s*\([^)]*\)\s*{([\s\S]*?)}/);
    return catchBlock ? catchBlock[1].trim() : '';
  });

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

  return patterns;
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
  } catch (err) {
    console.error(`❌ Failed to read file ${file}:`, err?.message || err);
    return;
  }
  
  // Get dynamic test file path and import statements
  const testFilePath = projectAnalyzer.getTestFilePath(file);
  const importStatements = projectAnalyzer.generateImportStatements(testFilePath, file);
  
  // Ensure test directory exists
  ensureDir(path.dirname(testFilePath));

  // Analyze code patterns to provide better context
  const codePatterns = analyzeCodePatterns(fileContent);

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
    responsePatterns: codePatterns.responsePatterns.length,
    conditionalBranches: codePatterns.conditionalBranches.length,
    asyncOperations: codePatterns.asyncOperations.length
  });

  let response;
  try {
    response = await ai.models.generateContent({
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

DETECTED CODE PATTERNS:
- Exports: ${codePatterns.exports.join(', ')}
- Response patterns: ${codePatterns.responsePatterns.join(', ')}
- Conditional branches: ${codePatterns.conditionalBranches.join(', ')}
- Async operations: ${codePatterns.asyncOperations.join(', ')}

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
  } catch (err) {
    console.error(`❌ AI generation failed for ${file}:`, err?.message || err);
    if (dryRun) {
      return { testFilePath, content: '' };
    }
    return testFilePath;
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
    return;
  }
  return testFilePath;
}

export { mainAgent };
