import fs from "fs";
import path from "path";
import improvePromptTemplate from "../prompts/improvePrompt.js";
import { getRelativeImport, ensureDir } from "../tools/pathUtils.js";
import { cleanGeneratedCode, validateGeneratedCode } from "../tools/codeCleanup.js";
import { analyzeProjectStructure } from "../tools/projectAnalyzer.js";
import { ai } from "../config/aiconfig.js";

// Function to analyze errors and suggest specific improvements
function analyzeErrorContext(errorLogs) {
  const analysis = {
    pathErrors: [],
    mockErrors: [],
    syntaxErrors: [],
    coverageGaps: [],
    suggestions: []
  };

  if (!errorLogs) return analysis;

  const lines = errorLogs.split('\n');
  
  for (const line of lines) {
    if (line.includes('Cannot find module')) {
      const moduleMatch = line.match(/Cannot find module ['"]([^'"]+)['"]/);
      if (moduleMatch) {
        analysis.pathErrors.push(moduleMatch[1]);
        analysis.suggestions.push(`Fix import path: ${moduleMatch[1]}`);
      }
    }
    
    if (line.includes('jest.mock()') || line.includes('out-of-scope variables')) {
      analysis.mockErrors.push(line.trim());
      analysis.suggestions.push('Fix jest.mock() scope issues');
    }
    
    if (line.includes('unexpected token') || line.includes('Jest failed to parse')) {
      analysis.syntaxErrors.push(line.trim());
      analysis.suggestions.push('Fix Jest syntax/configuration issues');
    }
    
    if (line.includes('coverage') || line.includes('uncovered')) {
      analysis.coverageGaps.push(line.trim());
      analysis.suggestions.push('Add tests for uncovered code paths');
    }
  }

  return analysis;
}

async function improveAgent(file, errorLogs) {
  if (!fs.existsSync(file)) {
    console.log(`⚠️ File ${file} does not exist. Skipping.`);
    return;
  }
  
  // Use dynamic project structure analysis
  const projectAnalyzer = analyzeProjectStructure();
  const fileContent = fs.readFileSync(file, "utf8");
  
  // Get dynamic test file path and import statements
  const testFilePath = projectAnalyzer.getTestFilePath(file);
  const importStatements = projectAnalyzer.generateImportStatements(testFilePath, file);
  
  // Ensure test directory exists
  ensureDir(path.dirname(testFilePath));
  
  // Analyze error context for better improvement targeting
  const errorAnalysis = analyzeErrorContext(errorLogs);
  
  const prompt = improvePromptTemplate(fileContent, importStatements.join('\n'), errorLogs, null, errorAnalysis);

  console.log(`🔄 Improving tests for ${file}`);
  console.log(`📁 Test file: ${testFilePath}`);
  console.log(`📦 Project type: ${projectAnalyzer.structure.type}`);
  if (errorLogs && errorLogs.trim()) {
    console.log(`📋 Error context received (${errorLogs.length} chars): ${errorLogs.substring(0, 200)}${errorLogs.length > 200 ? '...' : ''}`);
    if (errorAnalysis.suggestions.length > 0) {
      console.log(`💡 Key improvements needed: ${errorAnalysis.suggestions.slice(0, 3).join(', ')}`);
    }
  } else {
    console.log(`📋 No error context provided`);
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    config: {
      temperature: 0.1, // Lower temperature for more consistent output
    },
    contents: [
      { 
        role: "user", 
        parts: [{ 
          text: `You are an expert Jest test improvement specialist. Your task is to analyze failing tests and fix them to achieve high code coverage.

CRITICAL OUTPUT REQUIREMENTS:
- OUTPUT ONLY RAW JAVASCRIPT CODE
- NO MARKDOWN CODE BLOCKS (no \`\`\`javascript or \`\`\`)
- NO EXPLANATIONS OR COMMENTS OUTSIDE THE CODE
- NO INTRODUCTORY TEXT LIKE "Here's the fixed test:"
- START DIRECTLY WITH const, require, or jest statements

CRITICAL REQUIREMENTS:
1. Use EXACT import paths that match the file structure
2. Fix all jest.mock() scope and ordering issues
3. Generate tests that will actually pass with the real code
4. Focus on fixing the specific errors identified in the error logs
5. Ensure proper CommonJS require() syntax for Jest tests

PROJECT STRUCTURE INFO:
- Project type: ${projectAnalyzer.structure.type}
- Package type: ${projectAnalyzer.structure.packageType}
- Generated import statements to use: ${importStatements.join('\n')}

ERROR ANALYSIS:
- Path errors found: ${errorAnalysis.pathErrors.join(', ')}
- Mock errors: ${errorAnalysis.mockErrors.length > 0 ? 'Yes' : 'No'}
- Syntax errors: ${errorAnalysis.syntaxErrors.length > 0 ? 'Yes' : 'No'}
- Key improvements needed: ${errorAnalysis.suggestions.join(', ')}

Use the provided import statements EXACTLY as given. Generate corrected Jest test code that addresses these specific issues. Output only raw JavaScript code.`
        }] 
      },
      { role: "user", parts: [{ text: prompt }] }
    ],
  });

  // Get raw response and clean it
  let rawOutput = (response && ((response.message && response.message.content) || response.text)) || '';
  const cleanedOutput = cleanGeneratedCode(rawOutput);
  
  // Validate the cleaned code
  const issues = validateGeneratedCode(cleanedOutput);
  if (issues.length > 0) {
    console.log(`⚠️ Improve agent cleanup issues: ${issues.join(', ')}`);
  }
  
  fs.writeFileSync(testFilePath, cleanedOutput);
  return testFilePath;
}

export { improveAgent };
