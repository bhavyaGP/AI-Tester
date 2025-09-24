import fs from "fs";
import path from "path";

// Returns the relative import path from testFile to sourceFile, without .js extension
export function getRelativeImport(testFile, sourceFile) {
  const from = path.dirname(testFile);
  let relPath = path.relative(from, sourceFile).replace(/\\/g, "/");
  if (relPath.endsWith(".js")) relPath = relPath.slice(0, -3);
  return relPath.startsWith(".") ? relPath : `./${relPath}`;
}

// Ensures the directory exists, creates it recursively if not
export function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Returns the relative import path for a model from a test file
export function getModelImportPath(testFile, modelName) {
  // For tests in tests/server/controller/, models are at ../../../server/models/
  const testDir = path.dirname(testFile);
  const serverDir = path.resolve(testDir, "../../../server");
  const modelPath = path.join(serverDir, "models", `${modelName}.js`);
  let relPath = path.relative(testDir, modelPath).replace(/\\/g, "/");
  if (relPath.endsWith(".js")) relPath = relPath.slice(0, -3);
  return relPath.startsWith(".") ? relPath : `./${relPath}`;
}
