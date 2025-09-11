const fs = require("fs");
const path = require("path");

function getRelativeImport(testFile, sourceFile) {
  const from = path.dirname(testFile);
  let relPath = path.relative(from, sourceFile).replace(/\\/g, "/");
  if (relPath.endsWith(".js")) relPath = relPath.slice(0, -3);
  return relPath.startsWith(".") ? relPath : `./${relPath}`;
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

module.exports = { getRelativeImport, ensureDir };
