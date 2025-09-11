const fs = require("fs");
const path = require("path");
const improvePromptTemplate = require("../prompts/improvePrompt");
const { getRelativeImport, ensureDir } = require("../tools/fileUtils");
const { ai } = require("../config/aiconfig");
async function improveAgent(file, errorLogs) {
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
  // console.log("Relative Import:", relativeImport);
  // console.log("Error Logs:", errorLogs);
  const prompt = improvePromptTemplate(fileContent, relativeImport, errorLogs);

  console.log(`🔄 Improving tests for ${file}`);
  if (errorLogs) {
    console.log(`📋 Error context received: ${errorLogs.substring(0, 200)}${errorLogs.length > 200 ? '...' : ''}`);
  } else {
    console.log(`📋 No error context provided`);
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      { role: "user", parts: [{ text: "You are an expert analysis assistant for unit test generation. Carefully analyze the provided code, error logs, and existing tests to identify failures, gaps in coverage, and areas for improvement. Generate or modify Jest tests that address these issues, ensuring comprehensive coverage, robustness, and adherence to best practices." }] },
      { role: "user", parts: [{ text: prompt }] }
    ],
  });

  // Support multiple response shapes (response.message.content or response.text)
  const out = (response && ((response.message && response.message.content) || response.text)) || '';
  fs.writeFileSync(testFileName, out);
  return testFileName;
}

module.exports = { improveAgent };
