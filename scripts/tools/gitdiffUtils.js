import { execSync } from "child_process";
import fs from "fs";
import path from "path";

export function getChangedFiles(baseRef = "HEAD~1", headRef = "HEAD") {
  const changedFiles = execSync(`git diff --name-only ${baseRef} ${headRef}`)
    .toString()
    .split("\n")
    .map((f) => f.trim())
    .filter((f) => f && f.endsWith(".js") && (/^server\/|\/server\//).test(f))
    .filter((f) => {
      try {
        fs.accessSync(f);
        return true;
      } catch {
        return false;
      }
    });

  return changedFiles;
}

// Return detailed change status using git name-status
// [{ path, status: 'A'|'M'|'D'|'R', oldPath? }]
export function getChangedFilesDetailed(baseRef = "HEAD~1", headRef = "HEAD") {
  let output = "";
  try {
    output = execSync(`git diff --name-status ${baseRef} ${headRef}`).toString();
  } catch {
    return [];
  }
  const lines = output.split(/\r?\n/).filter(Boolean);
  const entries = [];
  for (const line of lines) {
    const parts = line.split(/\s+/);
    const status = parts[0];
    if (status.startsWith('R')) {
      const oldPath = parts[1];
      const newPath = parts[2];
      const p = newPath;
      if (p && p.endsWith('.js') && (/^server\/|\/server\//).test(p)) {
        entries.push({ path: p, status: 'R', oldPath });
      }
      continue;
    }
    const p = parts[1];
    if (!p) continue;
    if (!(p.endsWith('.js') && (/^server\/|\/server\//).test(p))) continue;
    if (status === 'A' || status === 'M' || status === 'D') {
      entries.push({ path: p, status });
    }
  }
  //log meaningful statuses
  console.log("🔍 Changed files:");
  for (const { path, status } of entries) {
    console.log(`  ${path}: ${status}`);
  }
  console.log("---------------------------");
  return entries;
}

export function getFileChangeStats(filePath, baseRef = "HEAD~1", headRef = "HEAD") {
  try {
    const numstat = execSync(`git diff --numstat ${baseRef} ${headRef} -- "${filePath}"`).toString().trim();
    if (!numstat) return { insertions: 0, deletions: 0, baseLines: getLinesAtRef(filePath, baseRef) };
    const [insertionsStr, deletionsStr] = numstat.split(/\s+/);
    const insertions = parseInt(insertionsStr || "0", 10) || 0;
    const deletions = parseInt(deletionsStr || "0", 10) || 0;
    const baseLines = getLinesAtRef(filePath, baseRef);
    return { insertions, deletions, baseLines };
  } catch {
    return { insertions: 0, deletions: 0, baseLines: getLinesAtRef(filePath, baseRef) };
  }
}

export function getChangePercent(filePath, baseRef = "HEAD~1", headRef = "HEAD") {
  const { insertions, deletions, baseLines } = getFileChangeStats(filePath, baseRef, headRef);
  const totalChanges = insertions + deletions;
  const denominator = Math.max(baseLines, 1);
  const percent = (totalChanges / denominator) * 100;
  return Math.min(100, Math.max(0, Number(percent.toFixed(2))));
}

// Read file content at a specific git ref
export function readFileAtRef(filePath, ref) {
  try {
    return execSync(`git show ${ref}:"${filePath}"`).toString();
  } catch {
    return "";
  }
}

// Extract exported symbol names from JS content (CommonJS + ESM)
export function extractExportsFromContent(content) {
  const exports = new Set();
  if (!content) return [];
  const namedExportMatches = content.match(/export\s*{([^}]+)}/g) || [];
  for (const match of namedExportMatches) {
    const names = match.match(/{([^}]+)}/)?.[1];
    if (names) names.split(',').map(n => n.trim().split(':')[0]).forEach(n => n && exports.add(n));
  }
  const functionExportMatches = content.match(/export\s+(?:async\s+)?function\s+(\w+)/g) || [];
  functionExportMatches.forEach(m => {
    const n = m.match(/function\s+(\w+)/)?.[1];
    if (n) exports.add(n);
  });
  const constExportMatches = content.match(/export\s+const\s+(\w+)/g) || [];
  constExportMatches.forEach(m => {
    const n = m.match(/const\s+(\w+)/)?.[1];
    if (n) exports.add(n);
  });
  const moduleExportMatches = content.match(/module\.exports\s*=\s*{([\s\S]*?)}/g) || [];
  for (const match of moduleExportMatches) {
    const inner = match.match(/{([\s\S]*?)}/)?.[1] || '';
    inner.split(',').map(s => s.trim()).forEach(pair => {
      const n = pair.split(':')[0]?.trim();
      if (n) exports.add(n);
    });
  }
  const directExportMatches = content.match(/module\.exports\.(\w+)\s*=\s*/g) || [];
  directExportMatches.forEach(m => {
    const n = m.match(/module\.exports\.(\w+)/)?.[1];
    if (n) exports.add(n);
  });
  return Array.from(exports);
}

export function getFileExportsAtRef(filePath, ref) {
  const content = readFileAtRef(filePath, ref);
  return extractExportsFromContent(content);
}

export function getExportDiff(filePath, baseRef = "HEAD~1", headRef = "HEAD") {
  const before = new Set(getFileExportsAtRef(filePath, baseRef));
  let afterContent = "";
  try {
    afterContent = fs.readFileSync(filePath, 'utf8');
  } catch {
    afterContent = readFileAtRef(filePath, headRef);
  }
  const after = new Set(extractExportsFromContent(afterContent));

  const removed = Array.from(before).filter(x => !after.has(x));
  const added = Array.from(after).filter(x => !before.has(x));
  const unchanged = Array.from(after).filter(x => before.has(x));

  return { added, removed, unchanged };
}

export function isLargeChange(filePath, thresholdPercent = 90, baseRef = "HEAD~1", headRef = "HEAD") {
  try {
    const p = getChangePercent(filePath, baseRef, headRef);
    return p >= thresholdPercent;
  } catch {
    return false;
  }
}

function getLinesAtRef(filePath, ref) {
  try {
    const content = execSync(`git show ${ref}:"${filePath}"`).toString();
    if (!content) return 0;
    // Normalize newlines and count
    return content.split(/\r?\n/).length;
  } catch {
    // Fallback to current file if not present at ref
    try {
      const current = fs.readFileSync(filePath, "utf8");
      return current.split(/\r?\n/).length;
    } catch {
      return 0;
    }
  }
}
