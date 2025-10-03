import { execSync } from "child_process";
import fs from "fs";
import dotenv from "dotenv";

// ----------------- Error Summarizer -----------------
export function summarizeError(rawError) {
  if (!rawError) return "Unknown error";

  const toText = (value) => (typeof value === "string" ? value : String(value ?? ""));
  const stripAnsi = (value) => toText(value).replace(/\u001b\[[0-9;]*m/g, "");
  const text = stripAnsi(rawError);
  const lines = text.split(/\r?\n/);

  const important = lines
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false;
      if (/^\s*at\s/.test(line)) return false;
      if (/node_modules\//.test(line)) return false;
      if (/jest-runtime/.test(line)) return false;
      return true;
    });

  const insights = new Map();
  const register = (msg, priority = 5) => {
    if (!msg) return;
    const trimmed = msg.trim();
    if (!trimmed) return;
    if (!insights.has(trimmed) || insights.get(trimmed) > priority) {
      insights.set(trimmed, priority);
    }
  };

  // Dynamic error analysis functions
  const analyzeErrorType = (line) => {
    const normalizedLine = line.toLowerCase();
    
    // Connection/Network errors
    if (/connect|timeout|refused|network|econnrefused|etimedout|enotfound/.test(normalizedLine)) {
      return { type: 'connection', priority: 2, category: 'Network/Connection' };
    }
    
    // Database errors
    if (/mongo|sql|database|sequelize|mysql|postgres|redis|connection/.test(normalizedLine)) {
      return { type: 'database', priority: 1, category: 'Database' };
    }
    
    // Authentication/Authorization
    if (/auth|jwt|token|unauthorized|forbidden|permission|login/.test(normalizedLine)) {
      return { type: 'auth', priority: 2, category: 'Authentication' };
    }
    
    // File system errors
    if (/enoent|eperm|file|directory|path|permission|access/.test(normalizedLine)) {
      return { type: 'filesystem', priority: 2, category: 'File System' };
    }
    
    // Memory/Performance errors
    if (/memory|heap|stack|range|recursion|limit|performance/.test(normalizedLine)) {
      return { type: 'memory', priority: 1, category: 'Memory/Performance' };
    }
    
    // HTTP/API errors
    if (/axios|http|api|request|response|status|rate.*limit/.test(normalizedLine)) {
      return { type: 'http', priority: 2, category: 'HTTP/API' };
    }
    
    // Test framework specific
    if (/jest|test.*suite|mock|expect|assertion/.test(normalizedLine)) {
      return { type: 'test', priority: 3, category: 'Test Framework' };
    }
    
    // Promise/Async errors
    if (/promise|async|await|unhandled|rejection/.test(normalizedLine)) {
      return { type: 'async', priority: 2, category: 'Async/Promise' };
    }
    
    // Syntax/Code errors
    if (/syntax|reference|type.*error|undefined|null/.test(normalizedLine)) {
      return { type: 'code', priority: 1, category: 'Code Error' };
    }
    
    // Validation errors
    if (/validation|required|invalid|schema/.test(normalizedLine)) {
      return { type: 'validation', priority: 2, category: 'Validation' };
    }
    
    return { type: 'unknown', priority: 5, category: 'General' };
  };

  const generateSuggestion = (line, analysis) => {
    const suggestions = {
      connection: "Check network connectivity, service availability, or mock external dependencies.",
      database: "Verify database connection, check credentials, or ensure database service is running.",
      auth: "Review authentication setup, check API keys, tokens, or user permissions.",
      filesystem: "Verify file paths exist, check permissions, or ensure required files are available.",
      memory: "Check for memory leaks, infinite loops, or optimize resource usage.",
      http: "Verify API endpoints, check rate limits, or mock HTTP requests in tests.",
      test: "Review test setup, check mocking configuration, or fix assertion logic.",
      async: "Add proper error handling with try/catch or .catch() for promises.",
      code: "Check for typos, missing imports, or undefined variables.",
      validation: "Ensure test data meets validation requirements or schema constraints.",
      unknown: "Review the error context and add appropriate error handling."
    };
    
    const suggestion = suggestions[analysis.type] || suggestions.unknown;
    
    // Extract key error information from the line
    const errorMatch = line.match(/(\w+Error):\s*(.+?)(?:\n|$)/i);
    if (errorMatch) {
      const [, errorType, errorMessage] = errorMatch;
      return `${analysis.category}: ${errorMessage.trim()}. ${suggestion}`;
    }
    
    // For lines with clear error patterns, extract the essence
    const essentialMatch = line.match(/^([A-Z_]+):\s*(.+?)(?:\s+at\s|$)/i) || 
                          line.match(/^(.+?Error):\s*(.+?)(?:\s+at\s|$)/i);
    
    if (essentialMatch) {
      const [, errorType, errorMsg] = essentialMatch;
      return `${analysis.category}: ${errorMsg.trim()}. ${suggestion}`;
    }
    
    // For other lines, provide concise context
    const cleanLine = line.replace(/\s+/g, ' ').trim();
    const shortContext = cleanLine.slice(0, 60);
    return `${analysis.category}: ${shortContext}${cleanLine.length > 60 ? '...' : ''}. ${suggestion}`;
  };

  // Process each important line dynamically
  const processedErrors = new Set();
  for (const line of important) {
    if (!line || processedErrors.has(line)) continue;
    
    const analysis = analyzeErrorType(line);
    const suggestion = generateSuggestion(line, analysis);
    
    register(suggestion, analysis.priority);
    processedErrors.add(line);
    
    // Limit processing to avoid overwhelming output
    if (processedErrors.size >= 10) break;
  }

  // Remove the old hardcoded detector loop since we now use dynamic analysis above

  const expectCalls = /Expected number of calls:\s*(\d+)[\s\S]*Received number of calls:\s*(\d+)/i.exec(text);
  if (expectCalls) {
    register(`Mock expected ${expectCalls[1]} call(s) but received ${expectCalls[2]}. Reset mocks or adjust assertions.`, 1);
  }

  const expectValues = /Expected:\s*([\s\S]+?)Received:/i.exec(text);
  if (expectValues) {
    const comparison = expectValues[1].replace(/\s+/g, " ").trim();
    register(`Assertion mismatch. Expected ${comparison}. Inspect the received value for differences.`, 1);
  }

  if (insights.size === 0) {
    const condensed = important.filter((line) => /Error:|TypeError:|SyntaxError:|Mongo|Cannot|Expected|Received|FAIL|●/i.test(line));
    const summary = (condensed.length ? condensed : important).slice(0, 3).join(" | ");
    return summary || text.split("\n")[0];
  }

  const topContext = important.slice(0, 2).filter(Boolean);
  topContext.forEach((ctx) => register(ctx, 8));

  return Array.from(insights.entries())
    .sort((a, b) => a[1] - b[1])
    .map(([message]) => message)
    .slice(0, 6)
    .join(" | ");
}

// ----------------- Coverage Runner -----------------
export function runCoverage(filePath) {
  const normalize = (p) => (p || "").replace(/\\/g, "/");
  const endsWithFile = (a, b) => normalize(a).endsWith(normalize(b));

  const parseFailureSummaries = (jsonText) => {
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

        if (Array.isArray(suite.assertionResults)) {
          for (const a of suite.assertionResults) {
            if (a.status === "failed") {
              const title = a.fullName || a.title || "<unknown test>";
              const msg = (Array.isArray(a.failureMessages) && a.failureMessages[0]) || "";
              snippet = summarizeError(msg);
              blocks.push(`File: ${suiteFile}\nTest: ${title}\n${snippet}`.trim());
            }
          }
        }

        if (!snippet && suite.message) {
          snippet = summarizeError(suite.message);
          blocks.push(`File: ${suiteFile}\nSuite Error:\n${snippet}`.trim());
        }
      }
      return blocks.join("\n\n---\n\n");
    } catch {
      return summarizeError(jsonText);
    }
  };

  const parseCoverageFromText = (text, target) => {
    if (!text) return 0;
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      if (!line.includes("|")) continue;
      if (/^\s*File\s*\|/.test(line)) continue;
      if (/^\s*All files\s*\|/.test(line)) continue;

      const cols = line.split("|").map((c) => c.trim());
      const pathCol = cols[0];
      if (!pathCol || pathCol === "---" || pathCol.startsWith("-")) continue;

      if (cols.length >= 5) {
        const stmtsPct = parseFloat((cols[1] || "").replace(/%/g, ""));
        const linesPct = parseFloat((cols[4] || "").replace(/%/g, ""));
        if (Number.isFinite(stmtsPct) || Number.isFinite(linesPct)) {
          const targetBase = target.split("/").pop();
          if (endsWithFile(pathCol, target) || 
              pathCol.includes(targetBase) || 
              pathCol.endsWith(".js") || 
              pathCol.includes("...")) {
            const pct = Number.isFinite(linesPct) ? linesPct : (Number.isFinite(stmtsPct) ? stmtsPct : 0);
            return Math.round(pct * 100) / 100;
          }
        }
      }
    }
    return 0;
  };

  try {
    if (fs.existsSync(".env")) {
      dotenv.config({ path: ".env" });
    } else if (fs.existsSync(".env.example")) {
      const parsed = dotenv.parse(fs.readFileSync(".env.example"));
      for (const [k, v] of Object.entries(parsed)) {
        if (process.env[k] === undefined) process.env[k] = v;
      }
    }

    const target = normalize(filePath);

    const cmdJson = `bunx jest --coverage --runInBand --forceExit --passWithNoTests --json --collectCoverageFrom="${target}" --findRelatedTests "${target}"`;
    let stdoutJson = "";
    try {
      stdoutJson = execSync(cmdJson, { stdio: "pipe", encoding: "utf8", timeout: 60000 });
    } catch (e) {
      stdoutJson = `${e.stdout || ""}`.trim() || `${e.stderr || ""}`.trim();
    }
    const errorSnippets = parseFailureSummaries(stdoutJson);

    const cmdText = `bunx jest --coverage --runInBand --forceExit --passWithNoTests ` +
      `--coverageReporters=text --collectCoverageFrom="${target}" --findRelatedTests "${target}"`;
    let stdoutText = "";
    try {
      stdoutText = execSync(cmdText, { stdio: "pipe", encoding: "utf8", timeout: 60000 });
    } catch (e) {
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
    const combined = `${err.stdout || ""}\n${err.stderr || ""}`.trim();
    const fallbackErrors = summarizeError(err.stdout || combined);

    let coverage = 0;
    try {
      const target = normalize(filePath);
      const cmdText = `bunx jest --coverage --runInBand --forceExit --passWithNoTests ` +
        `--coverageReporters=text --collectCoverageFrom="${target}" --findRelatedTests "${target}"`;
      const textOut = execSync(cmdText, { stdio: "pipe", encoding: "utf8", timeout: 60000 });
      coverage = parseCoverageFromText(textOut, target);
    } catch (_) {}

    return {
      coverage,
      errorSnippets: fallbackErrors || null,
      errors: fallbackErrors || (err.message || "Unknown error"),
      output: undefined,
    };
  }
}
