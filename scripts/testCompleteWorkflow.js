import { StateGraph } from "@langchain/langgraph";
import { mainAgent } from "./agent/mainAgent.js";
import { improveAgent } from "./agent/improveAgent.js";
import { runCoverage } from "./tools/coverageUtils.js";
import { setupProduction, validateProduction } from "./tools/productionSetup.js";
import fs from "fs";

const COVERAGE_THRESHOLD = 80;

async function runCompleteWorkflow(targetFile) {
  console.log("🚀 Running Complete AI Test Generation Workflow...\n");
  
  try {
    // 1. Production Setup Phase
    console.log("1️⃣ Production Setup Phase");
    console.log("🔧 Running production setup validation...");
    
    const validation = await validateProduction();
    
    if (!validation.valid) {
      console.log("⚠️ Setup issues detected, running full production setup...");
      const setupResult = await setupProduction();
      
      if (!setupResult.success) {
        console.error(`❌ Production setup failed: ${setupResult.error}`);
        return;
      }
      
      console.log("✅ Production setup completed successfully");
    } else {
      console.log("✅ Production setup validation passed");
    }
    
    // 2. File Analysis Phase
    console.log("\n2️⃣ File Analysis Phase");
    console.log(`🎯 Target file: ${targetFile}`);
    
    // Check existing coverage
    const testFileName = targetFile.replace(/\.(js|ts)$/, '.test.js');
    const testPath = testFileName.replace(
      /^(server\/|scripts\/)/,
      'tests/$1'
    );
    
    let existingCoverage = 0;
    let skipGeneration = false;
    
    if (fs.existsSync(testPath)) {
      console.log(`📋 Existing test found for ${targetFile}, checking coverage...`);
      const result = runCoverage(targetFile);
      existingCoverage = result.coverage;
      
      if (result.coverage >= COVERAGE_THRESHOLD) {
        console.log(`✅ Coverage ${result.coverage}% >= ${COVERAGE_THRESHOLD}% for ${targetFile}, skipping regeneration`);
        skipGeneration = true;
      } else {
        console.log(`📊 Coverage ${result.coverage}% < ${COVERAGE_THRESHOLD}% for ${targetFile}, will improve`);
      }
    }
    
    if (skipGeneration) {
      console.log("⏭️ Workflow completed - existing test has sufficient coverage");
      return;
    }
    
    // 3. Test Generation Phase
    console.log("\n3️⃣ Test Generation Phase");
    console.log(`⚡ Generating tests for ${targetFile}...`);
    
    const generatedTestFile = await mainAgent(targetFile);
    console.log(`✅ Test generated: ${generatedTestFile}`);
    
    // 4. Coverage Evaluation Phase
    console.log("\n4️⃣ Coverage Evaluation Phase");
    console.log(`📊 Running coverage analysis for ${targetFile}...`);
    
    const coverageResult = runCoverage(targetFile);
    console.log(`📈 Coverage achieved: ${coverageResult.coverage}%`);
    
    // 5. Improvement Phase (if needed)
    let attempts = 1;
    let finalCoverage = coverageResult.coverage;
    
    while (finalCoverage < COVERAGE_THRESHOLD && attempts < 3) {
      console.log(`\n5️⃣ Improvement Phase (Attempt ${attempts})`);
      console.log(`🔄 Coverage ${finalCoverage}% < ${COVERAGE_THRESHOLD}%, improving tests...`);
      
      let errorLogs = "";
      if (coverageResult.errorSnippets) {
        errorLogs = coverageResult.errorSnippets;
      } else if (coverageResult.errors) {
        errorLogs = coverageResult.errors;
      }
      
      await improveAgent(targetFile, errorLogs);
      
      const newCoverageResult = runCoverage(targetFile);
      finalCoverage = newCoverageResult.coverage;
      
      console.log(`📈 Updated coverage: ${finalCoverage}%`);
      attempts++;
    }
    
    // 6. Final Results
    console.log("\n6️⃣ Final Results");
    if (finalCoverage >= COVERAGE_THRESHOLD) {
      console.log(`🎉 SUCCESS: Achieved ${finalCoverage}% coverage (target: ${COVERAGE_THRESHOLD}%)`);
    } else {
      console.log(`⚠️ PARTIAL SUCCESS: Final coverage ${finalCoverage}% (target: ${COVERAGE_THRESHOLD}%)`);
    }
    
    console.log(`📁 Test file: ${generatedTestFile}`);
    console.log(`🔄 Improvement attempts: ${attempts - 1}`);
    console.log(`✅ Workflow completed successfully`);
    
  } catch (error) {
    console.error("❌ Workflow failed:", error.message);
    console.error(error.stack);
  }
}

// Test with a specific file
const targetFile = process.argv[2] || "server/controller/auth.controller.js";
console.log(`🎯 Testing complete workflow with: ${targetFile}\n`);

runCompleteWorkflow(targetFile);