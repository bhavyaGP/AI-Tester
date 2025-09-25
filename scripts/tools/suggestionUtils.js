import fs from "fs";

// Scan a file's content for common quality issues we want to surface before test generation
export function scanSuggestionsForFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return [];
    const content = fs.readFileSync(filePath, "utf8");
    return scanSuggestionsFromContent(content, filePath);
  } catch {
    return [];
  }
}

export function scanSuggestionsFromContent(content, filePath = "") {
  const suggestions = [];

  // 1) Unused imports or requires (very lightweight heuristic)
  const importLines = (content.match(/^(?:const|let|var)\s+\w+\s*=\s*require\(["'][^"']+["']\)/gm) || [])
    .concat(content.match(/^import\s+[^;]+;?/gm) || []);
  for (const line of importLines) {
    const varMatch = line.match(/^(?:const|let|var)\s+(\w+)/) || line.match(/^import\s+(?:\{[^}]+\}\s+as\s+)?(\w+)/);
    const varName = varMatch ? varMatch[1] : null;
    if (varName && !new RegExp(`\\b${varName}\\b`).test(content.replace(line, ""))) {
      suggestions.push(`Import '${varName}' appears unused.`);
    }
  }

  // 2) Missing else after if with return (encourages explicitness)
  if (/if\s*\([^)]*\)\s*\{[\s\S]*?return[\s\S]*?\}/.test(content) && !/else\s*\{/.test(content)) {
    suggestions.push("Consider adding else/else if blocks for clearer branching after early returns.");
  }

  // 3) Generic logical error: suspicious average calculation using addition instead of division
  // Matches patterns like: const averageX = totalSomething + count; (should likely be division)
  if (/(?:const|let|var)\s+[A-Za-z_$]*?(average|avg)[A-Za-z_$]*\s*=\s*[^;\n]*\b(total|sum|duration|time|value|score|amount)[^;\n]*\+[^;\n]*\b(count|length|num|number)\b/i.test(content)) {
    suggestions.push("Possible logical error: average computed with addition; consider dividing total by count.");
  }

  // 4) Division by count without zero-check
  if (/\b(total|sum|duration|time|value|score|amount)[^;\n]*\/[\s\S]*\b(count|length|num|number)\b/i.test(content) && !/(if|guard)[\s\S]*\b(count|length|num|number)\s*[!=]==?\s*0/i.test(content)) {
    suggestions.push("Potential divide-by-zero: add a guard when dividing by count.");
  }

  // 5) Try/catch with empty catch
  if (/try\s*\{[\s\S]*?\}\s*catch\s*\([^)]*\)\s*\{\s*\}/.test(content)) {
    suggestions.push("Empty catch block detected; add error handling/logging.");
  }

  // 6) Unreachable code after return in the same block (heuristic)
  if (/return[^;]*;[\r\n]+\s*[^\}\s][^\r\n]*$/m.test(content)) {
    suggestions.push("Unreachable code detected after return; refactor control flow.");
  }

  return suggestions;
}


