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

 

  return suggestions;
}


