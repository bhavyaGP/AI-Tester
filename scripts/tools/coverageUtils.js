import { execSync } from "child_process";
import fs from "fs";

export function runCoverage() {
  try {
    console.log("Running jest --coverage from utils");

    // Force exit and single-threaded to avoid open handles hang
    const result = execSync(
      "bunx jest --coverage --json --runInBand --forceExit",
      {
      stdio: "pipe",
      encoding: "utf8",
      timeout: 60000, // 60 seconds
      }
    );

    // Read coverage summary (Jest generates coverage/coverage-summary.json)
    const summary = JSON.parse(
      fs.readFileSync("coverage/coverage-summary.json", "utf8")
    );

    return {
      coverage: summary.total.lines.pct,
      summary,
      output: result,
      errors: null,
    };
  } catch (err) {
    console.error("⚠️ Test execution failed:", err.message);

    let summary = null;
    let coverage = 0;

    // Try to read coverage even when tests fail
    if (fs.existsSync("coverage/coverage-summary.json")) {
      try {
        summary = JSON.parse(
          fs.readFileSync("coverage/coverage-summary.json", "utf8")
        );
        coverage = summary.total.lines.pct;
      } catch (summaryErr) {
        console.error("⚠️ Could not parse coverage summary:", summaryErr.message);
      }
    }

    // Collect all error info
    let errorOutput = "";
    if (err.stdout) errorOutput += `\n--- STDOUT ---\n${err.stdout}`;
    if (err.stderr) errorOutput += `\n--- STDERR ---\n${err.stderr}`;
    if (err.message) errorOutput += `\n--- MESSAGE ---\n${err.message}`;

    return {
      coverage,
      summary,
      output: err.stdout || "",
      errors: errorOutput || "Unknown error occurred",
    };
  }
}
