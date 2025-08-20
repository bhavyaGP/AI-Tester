const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

function jestPromptTemplate(fileContent) {
  return `
You are an expert JavaScript testing assistant.  
Your job is to generate **complete and executable Jest unit tests** for the given code.

=== CODE START ===
${fileContent}
=== CODE END ===

TEST REQUIREMENTS:
- Use the Jest testing framework
- Cover ALL functions, methods, and exported modules in the file
- Organize tests using 'describe' and 'it/test' blocks
- Add meaningful test descriptions
- Include positive (expected behavior) and negative (error/invalid input) cases
- Test edge cases and boundary conditions
- Validate error handling (invalid params, wrong operations, etc.)
- Ensure generated code is executable Jest test code

IMPORTANT RESTRICTIONS:
- Do NOT include explanations, comments, or extra text
- Do NOT include markdown (no \`\`\` markers, no formatting)
- Output ONLY pure Jest test code
`;
}

async function generateTests() {
  // Get changed JS files from last commit
  const rawChanged = execSync("git diff --name-only HEAD~1 HEAD")
    .toString()
    .split("\n")
    .map((f) => f.trim())
    .filter(Boolean);

  const changedFiles = rawChanged
    .map((f) => f.replace(/\\/g, "/"))
    .filter(
      (f) =>
        f.endsWith(".js") && (f.startsWith("server/") || f.includes("/server/"))
    );

  if (changedFiles.length === 0) {
    console.log("No JS files changed in the last commit.");
    return;
  }

  // Gemini client
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  for (const file of changedFiles) {
    if (!fs.existsSync(file)) continue;

    const fileContent = fs.readFileSync(file, "utf8");
    if (!fileContent.trim()) continue;

    // Use template here
    const prompt = jestPromptTemplate(fileContent);

    console.log(`⚡ Generating tests for: ${file}`);

    try {
      const result = await model.generateContent(prompt);
      const tests = result.response.text();

      // const testFileName = `tests/${file.replace(".js", ".test.js")}`;

      // If file is already a test file, skip generating new one
      // if (file.includes(".test.js")) {
      //   console.log(
      //     `⏩ Skipping test generation for existing test file: ${file}`
      //   );
      //   continue;
      // }

      // // Generate test file path (inside /tests directory)
      // const baseName = path.basename(file, ".js"); // e.g. server
      // const testFileName = path.join("tests", `${baseName}.test.js`);

      // const testDir = path.dirname(testFileName);

      // if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

      // fs.writeFileSync(testFileName, tests);
      // console.log("-------------------------------");
      // console.log(`Tests generated: ${testFileName}`);

      // Generate test file path (inside /tests directory)
      const baseName = path.basename(file, ".js"); // e.g., server
      const testFileName = path.join("tests", `${baseName}.test.js`);
      const testDir = path.dirname(testFileName);

      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }

      // If test file already exists → append new tests
      if (fs.existsSync(testFileName)) {
        console.log(
          `✏️  Appending new tests to existing file: ${testFileName}`
        );
        fs.appendFileSync(testFileName, `\n\n${tests}`);
      } else {
        console.log(`🆕 Creating new test file: ${testFileName}`);
        fs.writeFileSync(testFileName, tests);
      }
    } catch (err) {
      console.error(
        `⚠️ Failed to generate/write tests for ${file}:`,
        err && err.message ? err.message : err
      );
      continue;
    }
  }
}

generateTests();
