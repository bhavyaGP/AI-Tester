import { StateGraph } from "@langchain/langgraph";
import { mainAgent } from "./agent/mainAgent.js";
import { improveAgent } from "./agent/improveAgent.js";
import { runCoverage } from "./tools/coverageUtils.js";
import { getChangedFiles } from "./tools/gitdiffUtils.js";

const COVERAGE_THRESHOLD = 80;

function buildWorkflow() {
  // State: what we pass between nodes
  const workflow = new StateGraph({
    channels: {
      file: null,
      coverage: 0,
      attempts: 0,
      errorLogs: "",
    },
  });

  // Node 1: Main Agent
  workflow.addNode("mainAgent", async (state) => {
    await mainAgent(state.file);
    return { ...state, attempts: state.attempts + 1 };
  });

  // Node 2: Improve Agent
  workflow.addNode("improveAgent", async (state) => {
    await improveAgent(state.file, state.errorLogs);
    return { ...state, attempts: state.attempts + 1 };
  });

  // Node 3: Coverage Tool
  workflow.addNode("coverageTool", async (state) => {
    const result = runCoverage();
    console.log(`--- Coverage Tool Result for ${state.file} ---`);
    console.log(result.output);
    console.log(`--------------------------------------------`);
    console.log(`📊 Coverage for ${state.file}: ${result.coverage}%`);
    
    // Log coverage summary if available
    if (result.summary) {
      console.log("📋 Coverage Summary:");
      console.log(`  Statements: ${result.summary.total.statements.pct}%`);
      console.log(`  Branches: ${result.summary.total.branches.pct}%`);
      console.log(`  Functions: ${result.summary.total.functions.pct}%`);
      console.log(`  Lines: ${result.summary.total.lines.pct}%`);
    }
    
    // Combine output and errors for comprehensive error logs
    let errorLogs = "";
    if (result.errors) {
      errorLogs += `ERRORS:\n${result.errors}\n\n`;
    }
    if (result.output) {
      errorLogs += `OUTPUT:\n${result.output}`;
    }
    
    return { 
      ...state, 
      coverage: result.coverage, 
      errorLogs: errorLogs.trim() 
    };
  });

  // Conditional edges
  workflow.addEdge("mainAgent", "coverageTool");
  workflow.addEdge("improveAgent", "coverageTool");

  workflow.addConditionalEdges("coverageTool", (state) => {
    if (state.coverage >= COVERAGE_THRESHOLD) {
      return "__end__"; // stop
    }
    if (state.attempts >= 5) {
      console.log(`❌ Max attempts reached for ${state.file}`);
      return "__end__";
    }
    return "improveAgent"; // retry
  });

  workflow.setEntryPoint("mainAgent");

  return workflow.compile();
}

async function runLangGraph() {
  const files = getChangedFiles();
  if (files.length === 0) {
    console.log("⚠️ No relevant JS files changed.");
    return;
  }

  const workflow = buildWorkflow();

  for (const file of files) {
    console.log(`🚀 Running LangGraph pipeline for ${file}`);
    await workflow.invoke({ file, coverage: 0, attempts: 0, errorLogs: "" });
  }
}

export { runLangGraph };
