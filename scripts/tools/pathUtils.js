import fs from "fs";
import path from "path";

export function getRelativeImport(testFile, sourceFile) {
  const from = path.dirname(testFile);
  let relPath = path.relative(from, sourceFile).replace(/\\/g, "/");
  if (relPath.endsWith(".js")) relPath = relPath.slice(0, -3);
  return relPath.startsWith(".") ? relPath : `./${relPath}`;
}

export function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}