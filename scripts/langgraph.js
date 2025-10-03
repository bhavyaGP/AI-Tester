import { StateGraph } from "@langchain/langgraph";
import { mainAgent } from "./agent/mainAgent.js";
import { improveAgent } from "./agent/improveAgent.js";
import { incrementalAgent } from "./agent/incrementalAgent.js";
import { runCoverage } from "./tools/coverageUtils.js";
import { getChangedFiles, getChangedFilesDetailed, getExportDiff, isLargeChange, analyzeFileChanges, isLargeChangeEnhanced } from "./tools/gitdiffUtils.js";
import { mergeTestContents, removeTestsForExports, mergeIncrementalTests } from "./tools/testMergeUtils.js";
import { setupProduction, validateProduction } from "./tools/productionSetup.js";
import { scanSuggestionsForFile } from "./tools/suggestionUtils.js";
import { suggestionAgent } from "./agent/suggestionAgent.js";
import fs from "fs";
import path from "path";
import readline from "readline";

const COVERAGE_THRESHOLD = 80;

// Helper function to ask user about specific file improvements
async function askUserForFileImprovement(file, suggestions) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log(`\n🔍 File: ${file}`);
    console.log(`💡 Found ${suggestions.length} potential improvements:`);
    for (const suggestion of suggestions) {
      console.log(`   • ${suggestion}`);
    }
    console.log(`\nWould you like to:`);
    console.log(`Y → Accept suggestions and skip test regeneration`);
    console.log(`N → Regenerate test cases (ignore suggestions)`);
    
    rl.question('\nEnter your choice (Y/N): ', (answer) => {
      rl.close();
      const choice = answer.trim().toUpperCase();
      resolve(choice === 'Y' || choice === 'YES');
    });
  });
}

// Helper function to handle well-tested files with per-file choice
async function handleWellTestedFile(file, coverage) {
  console.log(`✅ Test file already exists with ${coverage}% coverage for ${file}`);
  
  try {
    console.log(`� Analyzing potential improvements...`);
    const suggestions = await scanSuggestionsForFile(file);
    
    if (suggestions && suggestions.hasActionableSuggestions && suggestions.suggestions?.length > 0) {
      // Ask user specifically for this file
      const acceptSuggestions = await askUserForFileImprovement(file, suggestions.suggestions);
      
      if (acceptSuggestions) {
        console.log(`✅ Accepted suggestions - skipping test regeneration for ${file}`);
        
        // Show detailed recommendations
        try {
          const suggestionResult = await suggestionAgent(file, "", suggestions.suggestions);
          if (suggestionResult?.improvements) {
            console.log(`📋 Detailed improvement recommendations:`);
            console.log(suggestionResult.improvements);
          }
        } catch (error) {
          console.log(`⚠️ Could not generate detailed suggestions: ${error.message}`);
        }
        
        return true; // Skip test generation
      } else {
        console.log(`🔄 Will regenerate test cases for ${file} (ignoring existing coverage)`);
        return false; // Proceed with test generation
      }
    } else {
      console.log(`✨ No actionable improvements found - skipping test regeneration`);
      return true; // Skip test generation
    }
  } catch (error) {
    console.log(`⚠️ Could not analyze improvements: ${error.message}`);
    console.log(`✨ Skipping test regeneration due to analysis error`);
    return true; // Skip test generation on error
  }
}
async function checkExistingTestCoverage(file, testPath) {
  if (!fs.existsSync(testPath)) {
    return { exists: false, coverage: 0 };
  }

  try {
    // Run coverage on the existing test file to get current coverage
    const { execSync } = await import('child_process');
    const target = file.replace(/\\/g, "/");
    
    // Run Jest with coverage on the specific test file
    const cmd = `bunx jest --coverage --runInBand --silent --forceExit --passWithNoTests --coverageReporters=text --collectCoverageFrom="${target}" "${testPath}"`;
    let output;
    
    try {
      output = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
    } catch (error) {
      // Jest might exit with code 1 if tests fail, but still provide coverage info
      output = error.stdout || error.stderr || '';
    }
    
    // Parse coverage from the text output
    const lines = output.split(/\r?\n/);
    for (const line of lines) {
      if (!line.includes("|")) continue;
      if (/^\s*File\s*\|/.test(line)) continue;
      if (/^\s*All files\s*\|/.test(line)) continue;

      const cols = line.split("|").map((c) => c.trim());
      const pathCol = cols[0];
      if (!pathCol || pathCol === "---" || pathCol.startsWith("-")) continue;

      if (cols.length >= 5) {
        const linesPct = parseFloat((cols[4] || "").replace(/%/g, ""));
        if (Number.isFinite(linesPct)) {
          const targetBase = target.split("/").pop();
          if (pathCol.includes(targetBase) || pathCol.endsWith(".js")) {
            const coveragePercent = Math.round(linesPct * 100) / 100;
            console.log(`📊 Detected existing coverage: ${coveragePercent}% for ${file}`);
            return {
              exists: true,
              coverage: coveragePercent,
              hasGoodCoverage: coveragePercent >= COVERAGE_THRESHOLD
            };
          }
        }
      }
    }

    // If we couldn't parse coverage, assume it's low
    console.log(`⚠️ Could not parse coverage for ${file}, assuming low coverage`);
    return { exists: true, coverage: 0, hasGoodCoverage: false };
    
  } catch (error) {
    // If coverage command fails, try to extract coverage info from error output
    const errorOutput = error.stdout || error.stderr || error.message || '';
    
    // Parse coverage from error output (Jest sometimes includes coverage in stderr)
    const lines = errorOutput.split(/\r?\n/);
    for (const line of lines) {
      if (!line.includes("|")) continue;
      if (/^\s*File\s*\|/.test(line)) continue;
      if (/^\s*All files\s*\|/.test(line)) continue;

      const cols = line.split("|").map((c) => c.trim());
      const pathCol = cols[0];
      if (!pathCol || pathCol === "---" || pathCol.startsWith("-")) continue;

      if (cols.length >= 5) {
        const linesPct = parseFloat((cols[4] || "").replace(/%/g, ""));
        if (Number.isFinite(linesPct)) {
          const targetBase = file.split("/").pop();
          if (pathCol.includes(targetBase) || pathCol.endsWith(".js")) {
            const coveragePercent = Math.round(linesPct * 100) / 100;
            console.log(`📊 Detected existing coverage from error output: ${coveragePercent}% for ${file}`);
            return {
              exists: true,
              coverage: coveragePercent,
              hasGoodCoverage: coveragePercent >= COVERAGE_THRESHOLD
            };
          }
        }
      }
    }
    
    console.log(`⚠️ Could not check existing coverage for ${file}: ${error.message}`);
    return { exists: true, coverage: 0, hasGoodCoverage: false };
  }
}function buildWorkflow() {
  // State: what we pass between nodes
  const workflow = new StateGraph({
    channels: {
      file: null,
      coverage: 0,
      attempts: 0,
      errorLogs: "",
      skipGeneration: false,
      setupComplete: false,
      pipelinePaused: false,
      isIncrementalUpdate: false,
      targetFunctions: [],
      changeAnalysis: null,
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
      
      console.log("✅ setup done");
    } else {
      console.log("✅ Production setup validation passed");
    }
    
    return { ...state, setupComplete: true };
  });

  // Node 1: Analyze file changes to determine if incremental update is possible
  workflow.addNode("changeAnalyzer", async (state) => {
    console.log(`🔍 Analyzing changes for ${state.file}...`);
    
    try {
      const analysis = analyzeFileChanges(state.file);
      console.log(`📊 Change analysis: ${analysis.changePercent}% change, type: ${analysis.changeType}`);
      
      if (analysis.shouldRegenerateFromScratch) {
        console.log(`🔄 Large change detected (${analysis.changePercent}%), will regenerate from scratch`);
        return { 
          ...state, 
          isIncrementalUpdate: false,
          targetFunctions: [],
          changeAnalysis: analysis
        };
      }
      
      if (analysis.newFunctionsOnly.length > 0) {
        console.log(`⚡ Incremental update possible for functions: ${analysis.newFunctionsOnly.join(', ')}`);
        return { 
          ...state, 
          isIncrementalUpdate: true,
          targetFunctions: analysis.newFunctionsOnly,
          changeAnalysis: analysis
        };
      }
      
      console.log(`ℹ️ No new functions detected, proceeding with normal flow`);
      return { 
        ...state, 
        isIncrementalUpdate: false,
        targetFunctions: [],
        changeAnalysis: analysis
      };
      
    } catch (error) {
      console.log(`⚠️ Change analysis failed: ${error.message}, proceeding with normal flow`);
      return { 
        ...state, 
        isIncrementalUpdate: false,
        targetFunctions: [],
        changeAnalysis: null
      };
    }
  });

  // Node 2: Check if test generation should be skipped
  workflow.addNode("suggestionAgent", async (state) => {
    console.log(`🤖 Running suggestion analysis for ${state.file}...`);
    
    try {
      // Get intelligent suggestions for the file
      const suggestions = await scanSuggestionsForFile(state.file);
      
      // Only proceed with suggestion agent if there are actionable suggestions
      if (suggestions && suggestions.hasActionableSuggestions) {
        console.log(`💡 Found ${suggestions.suggestions?.length || 0} intelligent suggestions`);
        const suggestions_result = await suggestionAgent(state.file, state.errorLogs, suggestions.suggestions);
        
        if (suggestions_result?.error) {
          console.log(`⚠️ Suggestion analysis encountered issues: ${suggestions_result.error}`);
          return { ...state, skipGeneration: false };
        }
        
        if (suggestions_result?.suggestedSkip) {
          console.log(`🚫 Suggestion agent recommends skipping: ${suggestions_result.reason}`);
          return { ...state, skipGeneration: true };
        }
        
        console.log(`✅ Suggestion agent approves proceeding with test generation`);
        return { ...state, skipGeneration: false };
      } else {
        console.log(`ℹ️ No actionable suggestions found, proceeding with normal test generation`);
        return { ...state, skipGeneration: false };
      }
    } catch (error) {
      console.log(`⚠️ Suggestion analysis failed: ${error.message}`);
      // Don't fail the pipeline, just proceed without suggestions
      return { ...state, skipGeneration: false };
    }
  });

  // Node 3: Incremental test generation for specific functions
  workflow.addNode("incrementalAgent", async (state) => {
    if (state.skipGeneration) {
      console.log(`⏭️ Skipping incremental test generation for ${state.file} as suggested`);
      return { ...state };
    }

    console.log(`⚡ Generating incremental tests for functions: ${state.targetFunctions.join(', ')}`);
    try {
      const result = await incrementalAgent(state.file, state.errorLogs, state.targetFunctions);
      console.log(`✅ Incremental test generation completed: ${result.addedNewTests ? 'new tests added' : 'no new tests needed'}`);
      return { ...state };
    } catch (error) {
      console.error(`❌ Incremental agent failed: ${error.message}`);
      return { ...state, errorLogs: error.message };
    }
  });

  // Node 4: Generate tests with main agent
  workflow.addNode("mainAgent", async (state) => {
    if (state.skipGeneration) {
      console.log(`⏭️ Skipping test generation for ${state.file} as suggested`);
      return { ...state }; // Don't increment attempts here, let coverageTool handle it
    }

    console.log(`🤖 Generating tests for ${state.file}...`);
    try {
      const result = await mainAgent(state.file, state.errorLogs, state.focusExports);
      return { ...state }; // Don't increment attempts here, let coverageTool handle it
    } catch (error) {
      console.error(`❌ Main agent failed: ${error.message}`);
      return { ...state, errorLogs: error.message }; // Don't increment attempts here, let coverageTool handle it
    }
  });

  // Node 5: Improve tests with improve agent
  workflow.addNode("improveAgent", async (state) => {
    console.log(`🔧 Improving tests for ${state.file}...`);
    try {
      const result = await improveAgent(state.file, state.errorLogs);
      return { ...state }; // Don't increment attempts here, let coverageTool handle it
    } catch (error) {
      console.error(`❌ Improve agent failed: ${error.message}`);
      return { ...state, errorLogs: error.message }; // Don't increment attempts here, let coverageTool handle it
    }
  });

  // Node 6: Check coverage and update attempts
  workflow.addNode("coverageTool", async (state) => {
    // Increment attempt counter first
    const newAttempts = state.attempts + 1;
    console.log(`📊 Running coverage check for ${state.file} (Attempt ${newAttempts}/3)`);
    
    try {
      // Run coverage for the specific file and get the summarized result
      const result = runCoverage(state.file);
      const fileCoveragePercent = result && typeof result.coverage === 'number' ? Math.round(result.coverage) : 0;
      const errorSnippet = result && (result.errorSnippets || result.errors) ? (result.errorSnippets || result.errors) : null;

      if (errorSnippet) {
        // Attach human-friendly summary if available
        state.errorLogs = `${state.errorLogs}\n${errorSnippet}`.trim();
      }

      return {
        ...state,
        coverage: fileCoveragePercent,
        attempts: newAttempts, // Update attempt counter
        errorLogs: state.errorLogs,
      };
    } catch (error) {
      console.error(`❌ Coverage check failed: ${error.message}`);
      return {
        ...state,
        coverage: 0,
        attempts: newAttempts, // Update attempt counter even on error
        errorLogs: `${state.errorLogs}\n${error.message}`,
      };
    }
  });

  // EDGES: how to move between nodes

  // Start with production setup
  workflow.addEdge("productionSetup", "changeAnalyzer");

  // From change analyzer, go to suggestion agent
  workflow.addEdge("changeAnalyzer", "suggestionAgent");

  // From suggestion agent, decide between incremental or full generation
  workflow.addConditionalEdges("suggestionAgent", (state) => {
    if (state.isIncrementalUpdate && state.targetFunctions.length > 0) {
      console.log(`🎯 Routing to incremental agent for functions: ${state.targetFunctions.join(', ')}`);
      return "incrementalAgent";
    } else {
      console.log(`🔄 Routing to main agent for full generation`);
      return "mainAgent";
    }
  });

  // From incremental agent, always check coverage
  workflow.addEdge("incrementalAgent", "coverageTool");

  // From main agent, always check coverage
  workflow.addEdge("mainAgent", "coverageTool");

  // From improve agent, always check coverage
  workflow.addEdge("improveAgent", "coverageTool");

  // From coverage tool, make decisions based on coverage and attempts
  workflow.addConditionalEdges("coverageTool", (state) => {
    if (state.coverage >= COVERAGE_THRESHOLD) {
      console.log(`🎯 Target coverage reached: ${state.coverage}%`);
      return "__end__"; // stop
    }
    
    console.log(`📊 Current coverage: ${state.coverage}%, Attempts: ${state.attempts}/3`);
    
    if (state.attempts >= 3) {
      if (state.coverage === 0) {
        console.log(`❌ File remains at 0% coverage after 3 attempts`);
        console.log(`🚨 This file requires manual intervention:`);
        console.log(`   - Check if code is testable (e.g., not pure config)`);
        console.log(`   - Verify all dependencies are mockable`);
        console.log(`   - Review async/await handling`);
        console.log(`   - Consider refactoring for better testability`);
      } else {
        console.log(`⚠️ Max attempts reached for ${state.file} with ${state.coverage}% coverage`);
      }
      return "__end__";
    }
    
    // Special handling for 0% coverage files
    if (state.coverage === 0 && state.attempts >= 2) {
      console.log(`⚠️ File has 0% coverage after ${state.attempts} attempts`);
      console.log(`🔍 Invoking Improve Agent to analyze testability issues...`);
      return "improveAgent"; // One final attempt with improvement analysis
    }
    
    return "improveAgent"; // retry with improvements
  });

  workflow.setEntryPoint("productionSetup");

  return workflow.compile();
}

// Main execution logic
async function runLangGraph() {
  console.log("🚀 Starting AI Test Generation Pipeline...");
  
  const workflow = buildWorkflow();
  let pipelinePausedFlag = false;

  const changes = getChangedFilesDetailed();
  if (changes.length === 0) {
    console.log("ℹ️ No changes detected. Running on all files...");
    
    const files = getChangedFiles() || [];
    for (const file of files) {
      if (pipelinePausedFlag) break;

      // Check if test file already exists and has good coverage
      const testPath = file.replace(/\.js$/, ".test.js").replace(/^server/, "tests/server");
      const existingTestCheck = await checkExistingTestCoverage(file, testPath);
      if (existingTestCheck.exists && existingTestCheck.hasGoodCoverage) {
        const shouldSkip = await handleWellTestedFile(file, existingTestCheck.coverage);
        if (shouldSkip) {
          continue; // Skip test generation
        }
        // If user chose to regenerate, continue with test generation below
      }
      
      const result = await workflow.invoke({ 
        file, 
        coverage: 0, 
        attempts: 0, 
        errorLogs: "", 
        skipGeneration: false, 
        setupComplete: false, 
        pipelinePaused: false,
        isIncrementalUpdate: false,
        targetFunctions: [],
        changeAnalysis: null
      });
      if (result?.pipelinePaused) {
        console.log("⏹️ Pipeline paused by user request; stopping further processing.");
        pipelinePausedFlag = true;
        break;
      }
      if (result.coverage >= COVERAGE_THRESHOLD) {
        console.log(`🎉 Successfully achieved ${result.coverage}% coverage for ${file}`);
      }
      continue;
    }

    if (pipelinePausedFlag) {
      console.log("\n⏸️ AI Test Generation Pipeline paused before completion.");
    } else {
      console.log("\n✅ AI Test Generation Pipeline completed!");
    }
    return;
  }

  console.log(`📝 Processing ${changes.length} changed files...`);

  for (const { path: file, status } of changes) {
    if (pipelinePausedFlag) break;
    
    const testPath = file.replace(/\.js$/, ".test.js").replace(/^server/, "tests/server");

    if (status === 'D') {
      if (fs.existsSync(testPath)) {
        fs.rmSync(testPath, { force: true });
        console.log(`🗑️ Deleted test file for removed source: ${testPath}`);
      }
      continue;
    }

    if (status === 'A') {
      // Check if test file already exists and has good coverage (even for "new" files in git)
      const existingTestCheck = await checkExistingTestCoverage(file, testPath);
      if (existingTestCheck.exists && existingTestCheck.hasGoodCoverage) {
        const shouldSkip = await handleWellTestedFile(file, existingTestCheck.coverage);
        if (shouldSkip) {
          continue; // Skip test generation
        }
        // If user chose to regenerate, continue with test generation below
      }

      const result = await workflow.invoke({ 
        file, 
        coverage: 0, 
        attempts: 0, 
        errorLogs: "", 
        skipGeneration: false, 
        setupComplete: false, 
        pipelinePaused: false,
        isIncrementalUpdate: false,
        targetFunctions: [],
        changeAnalysis: null
      });
      if (result?.pipelinePaused) {
        console.log("⏹️ Pipeline paused by user request; stopping further processing.");
        pipelinePausedFlag = true;
        break;
      }
      if (result.coverage >= COVERAGE_THRESHOLD) {
        console.log(`🎉 Successfully achieved ${result.coverage}% coverage for ${file}`);
      }
      continue;
    }

    if (status === 'M' || status === 'R') {
      // First check if test file already exists and has good coverage
      const existingTestCheck = await checkExistingTestCoverage(file, testPath);
      if (existingTestCheck.exists && existingTestCheck.hasGoodCoverage) {
        const shouldSkip = await handleWellTestedFile(file, existingTestCheck.coverage);
        if (shouldSkip) {
          continue; // Skip test generation
        }
        // If user chose to regenerate, continue with test generation below
      }

      // If the change is huge, treat as replaced
      const replaced = isLargeChange(file);
      if (replaced) {
        if (fs.existsSync(testPath)) {
          fs.rmSync(testPath, { force: true });
          console.log(`♻️ Large change detected, regenerating tests from scratch for ${file}`);
        }
        const result = await workflow.invoke({ file, coverage: 0, attempts: 0, errorLogs: "", skipGeneration: false, setupComplete: false, pipelinePaused: false });
        if (result?.pipelinePaused) {
          console.log("⏹️ Pipeline paused by user request; stopping further processing.");
          pipelinePausedFlag = true;
          break;
        }
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
      const result = await workflow.invoke({ 
        file, 
        coverage: 0, 
        attempts: 0, 
        errorLogs: "", 
        skipGeneration: false, 
        setupComplete: false, 
        pipelinePaused: false, 
        focusExports: focus,
        isIncrementalUpdate: false,
        targetFunctions: [],
        changeAnalysis: null
      });
      if (result?.pipelinePaused) {
        console.log("⏹️ Pipeline paused by user request; stopping further processing.");
        pipelinePausedFlag = true;
        break;
      }
      if (result.coverage >= COVERAGE_THRESHOLD) {
        console.log(`🎉 Successfully achieved ${result.coverage}% coverage for ${file}`);
      }
    }
  }
  
  if (pipelinePausedFlag) {
    console.log("\n⏸️ AI Test Generation Pipeline paused before completion.");
  } else {
    console.log("\n✅ AI Test Generation Pipeline completed!");
  }
}

export { runLangGraph };