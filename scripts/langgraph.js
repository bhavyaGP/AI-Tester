const { StateGraph } = require("@langchain/langgraph");
const { mainAgent } = require("./agent/mainAgent");
const { improveAgent } = require("./agent/improveAgent");
const { runCoverage } = require("./tools/coverageUtils");
const { getChangedFiles } = require("./tools/gitdiffUtils");

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
    let coverage = 0;
    let errorLogs = "";

    try {
      require("child_process").execSync("npx jest --coverage", { stdio: "inherit" });
    } catch (err) {
      errorLogs = err.stdout?.toString() || err.message;
    }

    coverage = runCoverage();
    console.log(`📊 Coverage for ${state.file}: ${coverage}%`);

    return { ...state, coverage, errorLogs };
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

module.exports = { runLangGraph };
