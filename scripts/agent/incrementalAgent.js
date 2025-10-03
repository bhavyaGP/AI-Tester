import fs from "fs";
import path from "path";
import jestPromptTemplate from "../prompts/jestPrompt.js";
import dbPromptTemplate from "../prompts/dbPrompt.js";
import controllerPromptTemplate from "../prompts/controllerPrompt.js";
import { ensureDir } from "../tools/pathUtils.js";
import { cleanGeneratedCode, validateGeneratedCode } from "../tools/codeCleanup.js";
import { mergeTestContents, mergeIncrementalTests } from "../tools/testMergeUtils.js";
import { analyzeProjectStructure } from "../tools/projectAnalyzer.js";
import { ai } from "../config/aiconfig.js";

/**
 * Incremental Agent - Generates tests only for new/modified functions
 * This agent focuses on specific functions to save tokens and improve efficiency
 */

function analyzeCodePatternsForFunctions(fileContent, targetFunctions) {
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
    uncoveredEdgeCases: [],
    targetFunctions: targetFunctions || []
  };

  // Extract only exports that match target functions
  const exportMatches = fileContent.match(/export\s+(?:default\s+)?(?:function\s+)?(\w+)/g) || [];
  const moduleExportMatches = fileContent.match(/module\.exports\s*=\s*{([^}]*)}/g) || [];
  const directExportMatches = fileContent.match(/module\.exports\.(\w+)/g) || [];
  
  const allExports = [
    ...exportMatches.map(match => match.replace(/export\s+(?:default\s+)?(?:function\s+)?/, '')),
    ...moduleExportMatches.map(match => {
      const content = match.match(/{([^}]*)}/)?.[1] || '';
      return content.split(',').map(s => s.trim().replace(/[:"']/g, ''));
    }).flat(),
    ...directExportMatches.map(match => match.replace('module.exports.', ''))
  ].filter(Boolean);

  // Filter exports to only include target functions
  patterns.exports = targetFunctions ? 
    allExports.filter(exp => targetFunctions.includes(exp)) : 
    allExports;

  // Focus analysis on target functions only
  if (targetFunctions && targetFunctions.length > 0) {
    for (const funcName of targetFunctions) {
      // Create regex to find function definitions
      const funcRegex = new RegExp(`(?:export\\s+)?(?:async\\s+)?(?:function\\s+${funcName}|const\\s+${funcName}\\s*=|${funcName}\\s*:)`, 'g');
      const funcMatches = fileContent.match(funcRegex);
      
      if (funcMatches) {
        // Find the function body to analyze patterns
        const funcIndex = fileContent.indexOf(funcMatches[0]);
        const funcEndIndex = findFunctionEnd(fileContent, funcIndex);
        const funcBody = fileContent.substring(funcIndex, funcEndIndex);
        
        // Analyze patterns in this specific function
        analyzePatterns(funcBody, patterns, funcName);
      }
    }
  } else {
    // Fallback to analyze entire file
    analyzePatterns(fileContent, patterns);
  }

  return patterns;
}

function findFunctionEnd(content, startIndex) {
  let braceCount = 0;
  let inFunction = false;
  
  for (let i = startIndex; i < content.length; i++) {
    const char = content[i];
    
    if (char === '{') {
      braceCount++;
      inFunction = true;
    } else if (char === '}') {
      braceCount--;
      if (inFunction && braceCount === 0) {
        return i + 1;
      }
    }
  }
  
  return content.length; // Fallback
}

function analyzePatterns(content, patterns, functionName = null) {
  // Error handling patterns
  const tryMatches = content.match(/try\s*{[\s\S]*?}\s*catch\s*\([^)]*\)\s*{[\s\S]*?}/g) || [];
  patterns.errorHandling.push(...tryMatches.map(match => ({ 
    type: 'try-catch', 
    content: match.substring(0, 100) + '...',
    function: functionName 
  })));

  const throwMatches = content.match(/throw\s+new\s+\w+\([^)]*\)/g) || [];
  patterns.errorHandling.push(...throwMatches.map(match => ({ 
    type: 'throw', 
    content: match,
    function: functionName 
  })));

  // Response patterns
  const resMatches = content.match(/res\.(?:status|json|send)\([^)]*\)/g) || [];
  patterns.responsePatterns.push(...resMatches.map(match => ({ 
    content: match,
    function: functionName 
  })));

  // Conditional branches
  const ifMatches = content.match(/if\s*\([^)]*\)\s*{[^}]*}/g) || [];
  patterns.conditionalBranches.push(...ifMatches.map(match => ({ 
    content: match.substring(0, 100) + '...',
    function: functionName 
  })));

  // Async operations
  const awaitMatches = content.match(/await\s+[\w.]+\([^)]*\)/g) || [];
  patterns.asyncOperations.push(...awaitMatches.map(match => ({ 
    content: match,
    function: functionName 
  })));

  // Mongoose query chains
  const mongooseMatches = content.match(/\w+\.(?:find|findOne|create|update|delete|aggregate)\([^)]*\)(?:\.[\w()]+)*/g) || [];
  patterns.mongooseQueryChains.push(...mongooseMatches.map(match => ({ 
    content: match,
    function: functionName 
  })));
}

function selectPromptTemplate(filePath, patterns) {
  const fileName = path.basename(filePath);
  
  // Database/Model files
  if (patterns.models.length > 0 || fileName.includes('model') || fileName.includes('schema')) {
    return dbPromptTemplate;
  }
  
  // Controller files
  if (patterns.isRoute || fileName.includes('controller') || fileName.includes('route')) {
    return controllerPromptTemplate;
  }
  
  // Default to jest template
  return jestPromptTemplate;
}

function generateIncrementalPrompt(fileContent, patterns, targetFunctions, errorLogs = "") {
  const templateFunction = selectPromptTemplate("", patterns);
  
  // Create focused prompt that mentions only target functions
  const focusedInstructions = targetFunctions && targetFunctions.length > 0 
    ? `\n\nFOCUS ONLY ON THESE FUNCTIONS: ${targetFunctions.join(', ')}
      - Generate tests ONLY for the listed functions
      - Do not create tests for other functions in the file
      - Each function should have comprehensive test coverage including edge cases
      - If existing tests cover these functions, extend or enhance them`
    : '';

  const errorContext = errorLogs 
    ? `\n\nPREVIOUS ERROR CONTEXT:\n${errorLogs}\n\nAddress these issues in the new tests.`
    : '';

  // Call the template function with appropriate parameters
  // Note: The template functions expect (fileContent, relativeImport, errorLogs, envVariables)
  const basePrompt = typeof templateFunction === 'function' 
    ? templateFunction(fileContent, "", errorContext)
    : String(templateFunction);

  return basePrompt + focusedInstructions;
}

/**
 * Generate tests incrementally for specific functions only
 */
async function incrementalAgent(filePath, errorLogs = "", targetFunctions = []) {
  try {
    console.log(`🔍 Reading file: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }

    const fileContent = fs.readFileSync(filePath, "utf8");
    
    if (!fileContent.trim()) {
      throw new Error(`File is empty: ${filePath}`);
    }

    console.log(`🎯 Analyzing patterns for functions: ${targetFunctions.join(', ') || 'all functions'}`);
    const patterns = analyzeCodePatternsForFunctions(fileContent, targetFunctions);
    
    // Log what we're focusing on
    if (targetFunctions.length > 0) {
      console.log(`📍 Generating tests for ${targetFunctions.length} specific function(s): ${targetFunctions.join(', ')}`);
    } else {
      console.log(`📍 Generating tests for all functions in the file`);
    }

    const prompt = generateIncrementalPrompt(fileContent, patterns, targetFunctions, errorLogs);
    
    console.log("🤖 Calling AI for incremental test generation...");
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: prompt
    });
    
    // Extract generated text from response (matching mainAgent pattern)
    const generatedText = (response && ((response.message && response.message.content) || response.text)) || '';
    
    if (!generatedText) {
      throw new Error("AI response is empty or invalid");
    }

    const testPath = filePath.replace(/\.js$/, ".test.js").replace(/^server/, "tests/server");
    
    // Ensure directory exists
    ensureDir(path.dirname(testPath));
    
    // Clean and validate generated code
    const cleanedCode = cleanGeneratedCode(generatedText);
    const isValid = validateGeneratedCode(cleanedCode);
    
    if (!isValid) {
      throw new Error("Generated code failed validation");
    }

    // Check if test file already exists
    let existingTestContent = "";
    if (fs.existsSync(testPath)) {
      existingTestContent = fs.readFileSync(testPath, "utf8");
      console.log(`📝 Found existing test file, merging new tests for functions: ${targetFunctions.join(', ')}`);
    }

    // Merge with existing tests using incremental strategy
    const finalTestContent = mergeIncrementalTests(existingTestContent, cleanedCode, targetFunctions);
    
    // Write the merged test file
    fs.writeFileSync(testPath, finalTestContent);
    
    console.log(`✅ Incremental tests generated for ${targetFunctions.length || 'all'} function(s): ${testPath}`);
    
    return {
      success: true,
      testPath,
      targetFunctions,
      addedNewTests: !existingTestContent || finalTestContent !== existingTestContent
    };
    
  } catch (error) {
    console.error(`❌ Incremental agent failed: ${error.message}`);
    throw error;
  }
}

export { incrementalAgent };
