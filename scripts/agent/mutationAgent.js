import fs from "fs";
import path from "path";
import { mainAgent } from "./mainAgent.js";
import { analyzeProjectStructure } from "../tools/projectAnalyzer.js";
import { getChangePercent } from "../tools/gitdiffUtils.js";
import { mergeTestContents } from "../tools/testMergeUtils.js";
import { ensureDir } from "../tools/pathUtils.js";

export async function processFileWithMutationStrategy(filePath, options = {}) {
  const { thresholdPercent = 50, baseRef = "HEAD~1", headRef = "HEAD" } = options;

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ Source file not found: ${filePath}`);
    return null;
  }

  const projectAnalyzer = analyzeProjectStructure();
  const testFilePath = projectAnalyzer.getTestFilePath(filePath);
  ensureDir(path.dirname(testFilePath));

  const changePercent = getChangePercent(filePath, baseRef, headRef);
  const mode = changePercent >= thresholdPercent ? "overwrite" : "append";
  console.log(`📈 Change for ${filePath}: ${changePercent}% → mode: ${mode}`);

  if (mode === "overwrite") {
    const outPath = await mainAgent(filePath);
    return { mode, testFilePath: outPath };
  }

  // append mode
  const gen = await mainAgent(filePath, { dryRun: true });
  const generatedContent = (gen && gen.content) || "";
  if (!generatedContent.trim()) {
    console.log(`⚠️ No content generated for ${filePath}. Skipping.`);
    return null;
  }

  // If no existing test, write new
  if (!fs.existsSync(testFilePath)) {
    fs.writeFileSync(testFilePath, generatedContent);
    return { mode, testFilePath };
  }

  const existing = fs.readFileSync(testFilePath, "utf8");
  const merged = mergeTestContents(existing, generatedContent);
  fs.writeFileSync(testFilePath, merged);
  return { mode, testFilePath };
}

export async function processChangedFilesWithMutationStrategy(files, options = {}) {
  const results = [];
  for (const f of files) {
    try {
      const res = await processFileWithMutationStrategy(f, options);
      console.log(res)
      if (res) results.push(res);
    } catch (err) {
      console.error(`❌ Mutation processing failed for ${f}:`, err?.message || err);
    }
  }
  return results;
}


