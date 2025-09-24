import { StateGraph } from "@langchain/langgraph";
import { mainAgent } from "./agent/mainAgent.js";
import { improveAgent } from "./agent/improveAgent.js";
import { runCoverage } from "./tools/coverageUtils.js";
import { getChangedFiles } from "./tools/gitdiffUtils.js";
import { setupProduction, validateProduction } from "./tools/productionSetup.js";
import fs from "fs";
import path from "path";

const COVERAGE_THRESHOLD = 80;

function buildWorkflow() {
  // State: what we pass between nodes
  const workflow = new StateGraph({
    channels: {
      file: null,
      coverage: 0,
      attempts: 0,
      errorLogs: "",
      skipGeneration: false,
      setupComplete: false,
    },
  });

  // Node 0: Production Setup
  workflow.addNode("productionSetup", async (state) => {
    console.log("🔧 Running production setup validation...");
    
    const validation = await validateProduction();
    
    if (!validation.valid) {
      console.log("⚠️ Setup issues detected, running full production setup...");
      const setupResult = await setupProduction();
      
      if (!setupResult.success) {
        console.error(`❌ Production setup failed: ${setupResult.error}`);
        return { ...state, setupComplete: false };
      }
      
      console.log("✅ Production setup completed successfully");
    } else {
      console.log("✅ Production setup validation passed");
    }
    
    return { ...state, setupComplete: true };
  });

  // Node 1: Check existing coverage
  workflow.addNode("checkExisting", async (state) => {
    if (!state.setupComplete) {
      console.log("❌ Cannot proceed - production setup incomplete");
      return { ...state, skipGeneration: true };
    }
    
    const testFileName = state.file.replace(/\.(js|ts)$/, '.test.js');
    const testPath = testFileName.replace(
      /^(server\/|scripts\/)/,
      'tests/$1'
    );
    
    // Check if test file exists and has good coverage
    if (fs.existsSync(testPath)) {
      console.log(`📋 Existing test found for ${state.file}, checking coverage...`);
      const result = runCoverage(state.file);
      
      if (result.coverage >= COVERAGE_THRESHOLD) {
        console.log(`✅ Coverage ${result.coverage}% >= ${COVERAGE_THRESHOLD}% for ${state.file}, skipping regeneration`);
        return { ...state, coverage: result.coverage, skipGeneration: true };
      } else {
        console.log(`📊 Coverage ${result.coverage}% < ${COVERAGE_THRESHOLD}% for ${state.file}, will improve`);
        return { ...state, coverage: result.coverage, skipGeneration: false };
      }
    }
    
    return { ...state, skipGeneration: false };
  });

  // Node 2: Main Agent
  workflow.addNode("mainAgent", async (state) => {
    if (state.skipGeneration) {
      console.log(`⏭️ Skipping test generation for ${state.file} - already has sufficient coverage`);
      return state;
    }
    
    await mainAgent(state.file);
    return { ...state, attempts: state.attempts + 1 };
  });

  // Node 3: Improve Agent
  workflow.addNode("improveAgent", async (state) => {
    await improveAgent(state.file, state.errorLogs);
    return { ...state, attempts: state.attempts + 1 };
  });

  // Node 4: Coverage Tool
  workflow.addNode("coverageTool", async (state) => {
    if (state.skipGeneration) {
      return state; // Already has good coverage, skip
    }
    
    console.log(`Running coverage tool for ${state.file}`);
    const result = runCoverage(state.file);
    console.log(" result:", result);


    // Use enhanced manual error extraction instead of summary JSON
    let errorLogs = "";
    if (result.errorSnippets) {
      errorLogs = result.errorSnippets;
    } else if (result.errors) {
      errorLogs = result.errors;
    }
    
    return { 
      ...state, 
      coverage: result.coverage, 
      errorLogs: errorLogs.trim() 
    };
  });

  // Conditional edges
  workflow.addEdge("productionSetup", "checkExisting");
  workflow.addEdge("checkExisting", "__end__", (state) => state.skipGeneration);
  workflow.addEdge("checkExisting", "mainAgent", (state) => !state.skipGeneration);
  workflow.addEdge("mainAgent", "coverageTool");
  workflow.addEdge("improveAgent", "coverageTool");

  workflow.addConditionalEdges("coverageTool", (state) => {
    if (state.skipGeneration) {
      return "__end__"; // Already good coverage
    }
    if (state.coverage >= COVERAGE_THRESHOLD) {
      console.log(`✅ Target coverage ${state.coverage}% achieved for ${state.file}`);
      return "__end__"; // stop
    }
    if (state.attempts >= 2) {
      console.log(`❌ Max attempts reached for ${state.file}`);
      return "__end__";
    }
    return "improveAgent"; // retry
  });

  workflow.setEntryPoint("productionSetup");

  return workflow.compile();
}

async function runLangGraph() {
  console.log("🚀 Starting AI Test Generation Pipeline...");
  
  // Get files to test
  const files = getChangedFiles();
  if (files.length === 0) {
    console.log("⚠️ No relevant JS files changed.");
    return;
  }

  console.log(`📁 Found ${files.length} files to test: ${files.join(', ')}`);
  
  const workflow = buildWorkflow();

  for (const file of files) {
    console.log(`\n🎯 Running LangGraph pipeline for ${file}`);
    const result = await workflow.invoke({ 
      file, 
      coverage: 0, 
      attempts: 0, 
      errorLogs: "", 
      skipGeneration: false,
      setupComplete: false 
    });
    
    if (result.coverage >= COVERAGE_THRESHOLD) {
      console.log(`🎉 Successfully achieved ${result.coverage}% coverage for ${file}`);
    } else if (result.skipGeneration) {
      console.log(`⏭️ Skipped ${file} (already has sufficient coverage or setup failed)`);
    } else {
      console.log(`⚠️ Final coverage for ${file}: ${result.coverage}% (target: ${COVERAGE_THRESHOLD}%)`);
    }
  }
  
  console.log("\n✅ AI Test Generation Pipeline completed!");
}

export { runLangGraph };
