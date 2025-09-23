import fs from "fs";
import path from "path";
import jestPromptTemplate from "../prompts/jestPrompt.js";
import dbPromptTemplate from "../prompts/dbPrompt.js";
import controllerPromptTemplate from "../prompts/controllerPrompt.js";
import { getRelativeImport, ensureDir } from "../tools/fileUtils.js";
import { ai } from "../config/aiconfig.js";

// Function to analyze code patterns for better test generation
function analyzeCodePatterns(fileContent) {
  const patterns = {
    errorHandling: [],
    responsePatterns: [],
    conditionalBranches: [],
    asyncOperations: [],
    exports: []
  };

  // Extract exports
  const exportMatches = fileContent.match(/export\s+(?:default\s+)?(?:function\s+)?(\w+)/g) || [];
  patterns.exports = exportMatches.map(match => match.replace(/export\s+(?:default\s+)?(?:function\s+)?/, ''));

  // Extract error handling patterns
  const tryCatchMatches = fileContent.match(/try\s*{[\s\S]*?}\s*catch\s*\([^)]*\)\s*{[\s\S]*?}/g) || [];
  patterns.errorHandling = tryCatchMatches.map(match => {
    const catchBlock = match.match(/catch\s*\([^)]*\)\s*{([\s\S]*?)}/);
    return catchBlock ? catchBlock[1].trim() : '';
  });

  // Extract response patterns
  const responseMatches = fileContent.match(/res\.(status\(\d+\)\.)?json\([^)]*\)/g) || [];
  patterns.responsePatterns = responseMatches;

  // Extract conditional branches
  const ifMatches = fileContent.match(/if\s*\([^)]*\)\s*{[\s\S]*?}/g) || [];
  patterns.conditionalBranches = ifMatches.map(match => {
    const condition = match.match(/if\s*\(([^)]*)\)/);
    return condition ? condition[1].trim() : '';
  });

  // Extract async operations
  const asyncMatches = fileContent.match(/await\s+\w+\.\w+\([^)]*\)/g) || [];
  patterns.asyncOperations = asyncMatches;

  return patterns;
}

async function mainAgent(file) {
  if (!fs.existsSync(file)) {
    console.log(`⚠️ File ${file} does not exist. Skipping.`);
    return;
  }
  const fileContent = fs.readFileSync(file, "utf8");
  const baseName = path.basename(file, ".js");
  const relativeDir = path.dirname(file);
  const testDir = path.join("tests", relativeDir);
  const testFileName = path.join(testDir, `${baseName}.test.js`);

  ensureDir(testDir);

  const relativeImport = getRelativeImport(testFileName, file);

  // Analyze code patterns to provide better context
  const codePatterns = analyzeCodePatterns(fileContent);

  // Choose appropriate prompt based on file type
  let prompt;
  if (file.includes('db.js') || file.includes('database') || file.includes('connection')) {
    prompt = dbPromptTemplate(fileContent, relativeImport);
  } else if (file.includes('controller') || file.includes('Controller')) {
    prompt = controllerPromptTemplate(fileContent, relativeImport);
  } else {
    prompt = jestPromptTemplate(fileContent, relativeImport);
  }

  console.log(`⚡ Generating tests for ${file}`);
  console.log(`📊 Detected patterns:`, {
    exports: codePatterns.exports,
    responsePatterns: codePatterns.responsePatterns.length,
    conditionalBranches: codePatterns.conditionalBranches.length,
    asyncOperations: codePatterns.asyncOperations.length
  });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    config: {
      temperature: 0.2,
    },
    contents: [
      {
        role: "user",
        parts: [{
          text: `You are a Senior Unit Tester specializing in Jest test generation. Your role is to create focused, high-quality unit tests that match the ACTUAL implementation patterns in the provided code. 

CRITICAL ANALYSIS REQUIRED:
1. Analyze the actual code structure, error handling patterns, and response formats first
2. Generate tests ONLY for code paths that actually exist in the implementation
3. Match test expectations to the ACTUAL response patterns (res.status().json(), res.json(), etc.)
4. Test only realistic scenarios that can occur with the real code
5. Avoid over-testing theoretical edge cases that the code doesn't handle
6. Focus on achieving good coverage of the actual implemented code paths with tests that will actually pass
7. Don't include any markdown formatting symbol like ('''javascript or '''python) or explanations - output only the Jest test code
DETECTED CODE PATTERNS:
- Exports: ${codePatterns.exports.join(', ')}
- Response patterns: ${codePatterns.responsePatterns.join(', ')}
- Conditional branches: ${codePatterns.conditionalBranches.join(', ')}
- Async operations: ${codePatterns.asyncOperations.join(', ')}

Use these patterns to generate accurate tests that match the actual implementation. Output only the Jest test code without additional explanations.` }]
      },
      {
        role: "user",
        parts: [{ text: prompt }]
      }
    ],
  });
  const out = (response && ((response.message && response.message.content) || response.text)) || '';
  fs.writeFileSync(testFileName, out);
  return testFileName;
}

export { mainAgent };
