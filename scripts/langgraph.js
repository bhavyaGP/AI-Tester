import { StateGraph } from "@langchain/langgraph";
import { mainAgent } from "./agent/mainAgent.js";
import { improveAgent } from "./agent/improveAgent.js";
import { runCoverage } from "./tools/coverageUtils.js";
import { getChangedFiles, getChangedFilesDetailed, getExportDiff, isLargeChange } from "./tools/gitdiffUtils.js";
import { mergeTestContents, removeTestsForExports } from "./tools/testMergeUtils.js";
import { setupProduction, validateProduction } from "./tools/productionSetup.js";
import { scanSuggestionsForFile } from "./tools/suggestionUtils.js";
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
  // New: Suggestions node runs before coverage checks so issues are surfaced even if we skip generation
  workflow.addNode("suggestions", async (state) => {
    try {
      const suggestions = scanSuggestionsForFile(state.file);
      if (suggestions && suggestions.length > 0) {
        console.log("\n💡 Suggested improvements detected:");
        for (const s of suggestions) {
          console.log(`- ${s}`);
        }
      } else {
        console.log("\n✅ No code-quality suggestions detected for this file");
      }
    } catch (e) {
      console.warn("⚠️ Suggestion scan failed:", e?.message || e);
    }
    return state;
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
  workflow.addEdge("productionSetup", "suggestions");
  workflow.addEdge("suggestions", "checkExisting");
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
    console.log("🔍 Current attempts is :", state.attempts);
    if (state.attempts >= 3) {
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
  
  // Determine changed files with statuses
  const diffs = getChangedFilesDetailed();
  if (diffs.length === 0) {
    console.log("⚠️ No relevant JS files changed.");
    return;
  }

  console.log(`📁 Found ${diffs.length} changed files to process.`);
  
  const workflow = buildWorkflow();

  for (const entry of diffs) {
    const file = entry.path;
    const status = entry.status;
    console.log(`\n🎯 Processing ${status} ${file}`);

    const testFileName = file.replace(/\.(js|ts)$/, '.test.js');
    const testPath = testFileName.replace(/^(server\/|scripts\/)/, 'tests/$1');

    if (status === 'D') {
      // Delete corresponding test file
      if (fs.existsSync(testPath)) {
        fs.rmSync(testPath, { force: true });
        console.log(`🗑️ Removed test file for deleted source: ${testPath}`);
      }
      continue;
    }

    // For added or modified files
    if (status === 'A') {
      // New file → generate full tests
      const result = await workflow.invoke({ file, coverage: 0, attempts: 0, errorLogs: "", skipGeneration: false, setupComplete: false });
      if (result.coverage >= COVERAGE_THRESHOLD) {
        console.log(`🎉 Successfully achieved ${result.coverage}% coverage for ${file}`);
      }
      continue;
    }

    if (status === 'M' || status === 'R') {
      // If the change is huge, treat as replaced
      const replaced = isLargeChange(file);
      if (replaced) {
        if (fs.existsSync(testPath)) {
          fs.rmSync(testPath, { force: true });
          console.log(`♻️ Large change detected, regenerating tests from scratch for ${file}`);
        }
        const result = await workflow.invoke({ file, coverage: 0, attempts: 0, errorLogs: "", skipGeneration: false, setupComplete: false });
        if (result.coverage >= COVERAGE_THRESHOLD) {
          console.log(`🎉 Successfully achieved ${result.coverage}% coverage for ${file}`);
        }
        continue;
      }

      // Otherwise, compute export-level diff
      const { added, removed, unchanged } = getExportDiff(file);
      const focus = [...added]; // prioritize newly added exports

      // If there is an existing test file and removed exports, prune tests
      if (fs.existsSync(testPath) && removed.length > 0) {
        try {
          const existing = fs.readFileSync(testPath, 'utf8');
          const pruned = removeTestsForExports(existing, removed);
          if (pruned !== existing) {
            fs.writeFileSync(testPath, pruned);
            console.log(`✂️ Pruned tests for removed exports [${removed.join(', ')}] in ${testPath}`);
          }
        } catch {}
      }

      // Generate tests focused on added exports; if none, allow improvement for coverage
      const result = await workflow.invoke({ file, coverage: 0, attempts: 0, errorLogs: "", skipGeneration: false, setupComplete: false, focusExports: focus });
      if (result.coverage >= COVERAGE_THRESHOLD) {
        console.log(`🎉 Successfully achieved ${result.coverage}% coverage for ${file}`);
      }
    }
  }
  
  console.log("\n✅ AI Test Generation Pipeline completed!");
}

export { runLangGraph };
