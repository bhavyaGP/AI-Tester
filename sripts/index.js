const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
require("dotenv").config(); 
const { GoogleGenerativeAI } = require("@google/generative-ai");

function jestPromptTemplate(fileContent, relativePath) {
  return `
You are an expert JavaScript testing assistant.  
Your job is to generate **complete and executable Jest unit tests** for the given code.

=== CODE START ===
${fileContent}
=== CODE END ===

=== IMPORT PATH ===
The file being tested is located at: ${relativePath}
For tests in the tests/ directory, the correct import path should be: ../../${relativePath}

TEST REQUIREMENTS:
- Use the Jest testing framework
- Cover ALL functions, methods, and exported modules in the file
- Use the CORRECT import path: require('../../${relativePath}')
- Organize tests using 'describe' and 'it/test' blocks
- Add meaningful test descriptions
- Include positive (expected behavior) and negative (error/invalid input) cases
- Test edge cases and boundary conditions
- Validate error handling (invalid params, wrong operations, etc.)
- Ensure generated code is executable Jest test code
- Aim for high code coverage (90%+ lines, functions, branches)
- For Express apps, use supertest for HTTP testing

IMPORTANT RESTRICTIONS:
- Do NOT include explanations, comments, or extra text
- Do NOT include markdown (no \`\`\` markers, no formatting)
- Output ONLY pure Jest test code
- ALWAYS use the correct import path: require('../../${relativePath}')
`;
}

// ✅ Utility to check if a diff has real code changes (ignore comments/whitespace)
function hasCodeChange(diff) {
  const filtered = diff
    .split("\n")
    .filter(line => {
      if (!line.startsWith("+") && !line.startsWith("-")) return false;

      const code = line.slice(1).trim();

      // Ignore empty lines
      if (code === "") return false;

      // Ignore comments
      if (code.startsWith("//")) return false;
      if (code.startsWith("/*") || code.startsWith("*") || code.startsWith("*/")) return false;

      return true; // This is a meaningful change
    });

  return filtered.length > 0;
}

// Function to parse coverage results
function parseCoverageResults() {
  const coveragePath = path.join(__dirname, '../coverage/coverage-final.json');
  
  if (!fs.existsSync(coveragePath)) {
    console.log("⚠️ Coverage file not found");
    return null;
  }

  try {
    const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
    const results = {};
    
    Object.keys(coverageData).forEach(file => {
      const fileCoverage = coverageData[file];
      const summary = fileCoverage.s; // statements
      const functions = fileCoverage.f; // functions
      const branches = fileCoverage.b; // branches
      
      // Calculate percentages
      const stmtTotal = Object.keys(summary).length;
      const stmtCovered = Object.values(summary).filter(count => count > 0).length;
      const stmtPercent = stmtTotal > 0 ? (stmtCovered / stmtTotal * 100).toFixed(2) : 0;
      
      const funcTotal = Object.keys(functions).length;
      const funcCovered = Object.values(functions).filter(count => count > 0).length;
      const funcPercent = funcTotal > 0 ? (funcCovered / funcTotal * 100).toFixed(2) : 0;
      
      results[file] = {
        statements: { covered: stmtCovered, total: stmtTotal, percent: stmtPercent },
        functions: { covered: funcCovered, total: funcTotal, percent: funcPercent }
      };
    });
    
    return results;
  } catch (error) {
    console.error("Error parsing coverage results:", error.message);
    return null;
  }
}

// Function to display coverage summary
function displayCoverageSummary(coverageResults) {
  if (!coverageResults) return;
  
  console.log("\n📊 COVERAGE SUMMARY:");
  console.log("=" .repeat(60));
  
  Object.keys(coverageResults).forEach(file => {
    const relativePath = path.relative(process.cwd(), file);
    const coverage = coverageResults[file];
    
    console.log(`\n📁 ${relativePath}`);
    console.log(`   Statements: ${coverage.statements.covered}/${coverage.statements.total} (${coverage.statements.percent}%)`);
    console.log(`   Functions:  ${coverage.functions.covered}/${coverage.functions.total} (${coverage.functions.percent}%)`);
    
    // Add coverage status indicators
    const stmtPercent = parseFloat(coverage.statements.percent);
    const funcPercent = parseFloat(coverage.functions.percent);
    
    if (stmtPercent >= 90 && funcPercent >= 90) {
      console.log("   Status: ✅ Excellent coverage!");
    } else if (stmtPercent >= 70 && funcPercent >= 70) {
      console.log("   Status: 🟡 Good coverage");
    } else {
      console.log("   Status: ❌ Needs improvement");
    }
  });
  
  console.log("\n" + "=" .repeat(60));
}

async function generateTestsWithCoverage() {
  console.log("🚀 Starting AI Test Generation with Coverage Analysis...\n");

  // Get changed JS files in the last commit
  const rawChanged = execSync("git diff --name-only HEAD~1 HEAD")
    .toString()
    .split("\n")
    .map((f) => f.trim())
    .filter(Boolean);

  console.log("Changed files in the last commit:", rawChanged);

  const changedFiles = rawChanged
    .map((f) => f.replace(/\\/g, "/"))
    .filter(
      (f) => f.endsWith(".js") && 
             (f.startsWith("server/") || f.includes("/server/")) &&
             !f.includes(".test.") &&
             !f.includes(".spec.")
    );
  console.log("Relevant changed files:", changedFiles);
  
  if (changedFiles.length === 0) {
    console.log("⚠️ No relevant JS files changed in the last commit.");
    return;
  }

  // Gemini client
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  let testsGenerated = 0;

  for (const file of changedFiles) {
    if (!fs.existsSync(file)) continue;

    // Get file diff
    const diff = execSync(`git diff HEAD~1 HEAD -- ${file}`).toString();
    console.log("------------------");
    console.log(`\nProcessing file: ${file}`);
    console.log("Diff:", diff);
    console.log("------------------");
    
    // Check if diff contains real code changes
    if (!hasCodeChange(diff)) {
      console.log(`⏭️ Skipping ${file} (only comments/whitespace changed)`);
      continue;
    }

    const fileContent = fs.readFileSync(file, "utf8");
    if (!fileContent.trim()) continue;

    const prompt = jestPromptTemplate(fileContent, file);

    console.log(`⚡ Generating comprehensive tests for: ${file}`);

    try {
      const result = await model.generateContent(prompt);
      const tests = result.response.text();

      const testFileName = `tests/${file.replace(".js", ".test.js")}`;
      const testDir = path.dirname(testFileName);

      if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

      fs.writeFileSync(testFileName, tests);
      testsGenerated++;
      console.log("-------------------------------");
      console.log(`✅ Tests generated: ${testFileName}`);
    } catch (err) {
      console.error(
        `⚠️ Failed to generate/write tests for ${file}:`,
        err && err.message ? err.message : err
      );
      continue;
    }
  }

  // Run Jest with coverage after generating all tests
  if (testsGenerated > 0) {
    console.log(`\n🧪 Running Jest tests with coverage for ${testsGenerated} generated test file(s)...`);
    try {
      // Run tests with coverage
      execSync("npm run test:coverage", { stdio: "inherit" });
      
      console.log("\n✅ Tests completed successfully!");
      
      // Parse and display coverage results
      const coverageResults = parseCoverageResults();
      displayCoverageSummary(coverageResults);
      
      console.log("\n📁 Detailed Reports Available:");
      console.log("   HTML Report: coverage/lcov-report/index.html");
      console.log("   JSON Report: coverage/coverage-final.json");
      console.log("   LCOV Report: coverage/lcov.info");
      
    } catch (error) {
      console.error("❌ Failed to run tests with coverage:", error.message);
      
      // Still try to show any available coverage info
      const coverageResults = parseCoverageResults();
      if (coverageResults) {
        displayCoverageSummary(coverageResults);
      }
    }
  } else {
    console.log("\n⚠️ No tests were generated, skipping coverage analysis.");
  }
}

generateTestsWithCoverage();
