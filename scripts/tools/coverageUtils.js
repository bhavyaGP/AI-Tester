import { execSync } from "child_process";
import fs from "fs";
import dotenv from "dotenv";

// Single public API: runCoverage(filePath)
// - Runs Jest for tests related to the given file and collects coverage for that file only
// - Does NOT read from coverage/ folder
// - Summarizes each failed test case in 3–4 lines
export function runCoverage(filePath) {
  // Tiny helpers (scoped locally to keep only one exported function)
  const normalize = (p) => (p || "").replace(/\\/g, "/");
  const endsWithFile = (a, b) => normalize(a).endsWith(normalize(b));

  const parseFailureSummaries = (jsonText) => {
    // Jest stdout includes coverage summary before JSON; extract JSON part
    const parts = jsonText.split("================================================================================\n");
    const jsonPart = parts.length > 1 ? parts[1].trim() : jsonText;
    try {
      const report = JSON.parse(jsonPart);
      if (!report || !Array.isArray(report.testResults)) return "";
      const blocks = [];
      for (const suite of report.testResults) {
        if (suite.status !== "failed") continue;
        const suiteFile = suite.name || suite.testFilePath || "<unknown file>";
        let snippet = "";
        // First, check assertionResults for failed tests
        if (Array.isArray(suite.assertionResults)) {
          for (const a of suite.assertionResults) {
            if (a.status === "failed") {
              const title = a.fullName || a.title || "<unknown test>";
              const msg = (Array.isArray(a.failureMessages) && a.failureMessages[0]) || "";
              const rawLines = msg.split(/\r?\n/);
              const filtered = rawLines.filter((line) => {
                if (/^\s*at\s/.test(line)) return false;
                if (/node_modules\//.test(line)) return false;
                if (/jest-runtime/.test(line)) return false;
                return /Expected|Received|toEqual|toBe|toHaveBeen|Error:|TypeError:|SyntaxError:|FAIL|●/.test(line) || line.trim().length > 0;
              });
              snippet = filtered.slice(0, 4).join("\n");
              blocks.push(`File: ${suiteFile}\nTest: ${title}\n${snippet}`.trim());
            }
          }
        }
        // If no assertion failures, extract from suite message (e.g., syntax errors)
        if (!snippet && suite.message) {
          const rawLines = suite.message.split(/\r?\n/);
          const filtered = rawLines.filter((line) => {
            if (/^\s*at\s/.test(line)) return false;
            if (/node_modules\//.test(line)) return false;
            if (/jest-runtime/.test(line)) return false;
            return /Expected|Received|toEqual|toBe|toHaveBeen|Error:|TypeError:|SyntaxError:|FAIL|●/.test(line) || line.trim().length > 0;
          });
          snippet = filtered.slice(0, 4).join("\n");
          blocks.push(`File: ${suiteFile}\nSuite Error:\n${snippet}`.trim());
        }
      }
      return blocks.join("\n\n---\n\n");
    } catch {
      // Not JSON; return first few lines as a coarse fallback
      const lines = (jsonText || "").split(/\r?\n/).filter(Boolean);
      return lines.slice(0, 20).join("\n");
    }
  };

  const parseCoverageFromText = (text, target) => {
    if (!text) return 0;
    const lines = text.split(/\r?\n/);
    
    // Coverage table rows are pipe-separated. Parse all table rows.
    for (const line of lines) {
      if (!line.includes("|")) continue;
      // Skip header and aggregate rows
      if (/^\s*File\s*\|/.test(line)) continue;
      if (/^\s*All files\s*\|/.test(line)) continue;

      const cols = line.split("|").map((c) => c.trim());
      const pathCol = cols[0];
      
      // Skip empty or non-file rows
      if (!pathCol || pathCol === "---" || pathCol.startsWith("-")) continue;
      
      // For single file coverage runs, if we see any data row with coverage percentages,
      // it's likely our target file (Jest truncates paths in narrow terminals)
      if (cols.length >= 5) {
        const stmtsPct = parseFloat((cols[1] || "").replace(/%/g, ""));
        const linesPct = parseFloat((cols[4] || "").replace(/%/g, ""));
        
        // If we have valid percentages and this looks like a file row
        if (Number.isFinite(stmtsPct) || Number.isFinite(linesPct)) {
          // Check if it could be our target file (either exact match or truncated match)
          const targetBase = target.split('/').pop(); // Get filename
          if (endsWithFile(pathCol, target) || 
              pathCol.includes(targetBase) || 
              pathCol.endsWith('.js') || 
              pathCol.includes('...')) {
            const pct = Number.isFinite(linesPct) ? linesPct : (Number.isFinite(stmtsPct) ? stmtsPct : 0);
            return Math.round(pct * 100) / 100;
          }
        }
      }
    }
    return 0;
  };

  try {
    // Load env from .env or .env.example (do not fail if missing)
    if (fs.existsSync(".env")) {
      dotenv.config({ path: ".env" });
    } else if (fs.existsSync(".env.example")) {
      const parsed = dotenv.parse(fs.readFileSync(".env.example"));
      for (const [k, v] of Object.entries(parsed)) {
        if (process.env[k] === undefined) process.env[k] = v;
      }
    }

      const target = normalize(filePath);

      // 1) Run once to get machine-readable test results (JSON)
      const cmdJson = `bunx jest --coverage --runInBand --forceExit --passWithNoTests --json --collectCoverageFrom="${target}" --findRelatedTests "${target}"`;
      let stdoutJson = "";
      try {
        stdoutJson = execSync(cmdJson, { stdio: "pipe", encoding: "utf8", timeout: 60000 });
      } catch (e) {
        // On test failures, Jest exits non-zero; still capture output for parsing
        stdoutJson = `${e.stdout || ""}`.trim() || `${e.stderr || ""}`.trim();
      }
      const errorSnippets = parseFailureSummaries(stdoutJson);

      // 2) Run again to print coverage table to stdout (text)
      // Note: Do not read coverage/ folder; parse from terminal output only
      const cmdText = `bunx jest --coverage --runInBand --forceExit --passWithNoTests ` +
        `--coverageReporters=text --collectCoverageFrom="${target}" --findRelatedTests "${target}"`;
      let stdoutText = "";
      try {
        stdoutText = execSync(cmdText, { stdio: "pipe", encoding: "utf8", timeout: 60000 });
      } catch (e) {
        // Even if tests fail, we'll still try to parse any stdout/stderr produced
        stdoutText = `${e.stdout || ""}\n${e.stderr || ""}`;
      }

      const coverage = parseCoverageFromText(stdoutText, target);

      return {
        coverage,
        errorSnippets: errorSnippets || null,
        errors: errorSnippets || null,
        output: undefined,
      };
    } catch (err) {
      // If the JSON run failed, try to salvage info from stdout/stderr
      const combined = `${err.stdout || ""}\n${err.stderr || ""}`.trim();
      const fallbackErrors = parseFailureSummaries(err.stdout || combined);

      // Attempt a text coverage run anyway to extract coverage from output
      let coverage = 0;
      try {
        const target = normalize(filePath);
        const cmdText = `bunx jest --coverage --runInBand --forceExit --passWithNoTests ` +
          `--coverageReporters=text --collectCoverageFrom="${target}" --findRelatedTests "${target}"`;
        const textOut = execSync(cmdText, { stdio: "pipe", encoding: "utf8", timeout: 60000 });
        coverage = parseCoverageFromText(textOut, target);
      } catch (_) {
        // ignore
      }

      return {
        coverage,
        errorSnippets: fallbackErrors || null,
        errors: fallbackErrors || (err.message || "Unknown error"),
        output: undefined,
      };
    }
  }

