const fs = require("fs");
const path = require("path");
const jestPromptTemplate = require("../prompts/jestPrompt");
const { getRelativeImport, ensureDir } = require("../tools/fileUtils");
const { ai } = require("../config/aiconfig");

async function mainAgent(file) {
  const fileContent = fs.readFileSync(file, "utf8");
  const baseName = path.basename(file, ".js");
  const relativeDir = path.dirname(file);
  const testDir = path.join("tests", relativeDir);
  const testFileName = path.join(testDir, `${baseName}.test.js`);

  ensureDir(testDir);

  const relativeImport = getRelativeImport(testFileName, file);
  const prompt = jestPromptTemplate(fileContent, relativeImport);

  console.log(`⚡ Generating tests for ${file}`);

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: "user",
        parts: [{ text: "You are a Senior AI Unit Tester specializing in Jest test generation. Your role is to create comprehensive, high-quality unit tests that achieve excellent code coverage, including all standard scenarios, edge cases, error conditions, and boundary values. Analyze the provided code, identify all functions, methods, and logical paths, then generate Jest tests that cover: 1) Happy path scenarios with valid inputs, 2) Edge cases like empty inputs, null/undefined values, maximum/minimum limits, and unusual data types, 3) Error handling for exceptions, invalid inputs, and asynchronous failures, 4) Integration with dependencies (mocks/stubs where needed), 5) Performance considerations if applicable. Ensure tests are readable, maintainable, and follow Jest best practices, including proper setup/teardown, descriptive test names, and assertions for all expected behaviors. Aim for at least 90% coverage, focusing on branches, statements, and functions. Output only the Jest test code without additional explanations." }]
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

module.exports = { mainAgent };
