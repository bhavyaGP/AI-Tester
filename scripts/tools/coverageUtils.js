const { execSync } = require("child_process");
const fs = require("fs");

function runCoverage() {
  try {
    execSync("npx jest --coverage --coverageReporters=json-summary", { stdio: "inherit" });
    const summary = JSON.parse(fs.readFileSync("coverage/coverage-summary.json", "utf8"));
    return summary.total.lines.pct;
  } catch (err) {
    console.error("⚠️ Jest failed:", err.message);
    return 0;
  }
}
  
module.exports = { runCoverage };
