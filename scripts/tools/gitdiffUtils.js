import { execSync } from "child_process";
import fs from "fs";

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
