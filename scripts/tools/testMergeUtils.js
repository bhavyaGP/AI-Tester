// Simple, conservative merging strategy for Jest tests.
// - Avoid duplicates by detecting existing top-level "describe"/"it" signatures
// - Append new, non-duplicate blocks at the end, preserving existing content

function extractTopLevelBlocks(content) {
  const blocks = [];
  const regex = /(describe\(|it\(|test\()\s*([\s\S]*?\{)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const start = match.index;
    const header = match[0];
    const nameMatch = content.slice(start).match(/^(describe|it|test)\s*\(\s*([`'\"])([\s\S]*?)\2/);
    const name = nameMatch ? `${nameMatch[1]}::${nameMatch[3]}` : `${header}@${start}`;
    blocks.push({ name, start });
  }
  return new Set(blocks.map(b => b.name));
}

export function mergeTestContents(existingContent, newContent) {
  const existing = existingContent || "";
  const incoming = newContent || "";

  if (!existing.trim()) return incoming;
  if (!incoming.trim()) return existing;

  const existingKeys = extractTopLevelBlocks(existing);
  const lines = incoming.split(/\r?\n/);
  const output = [existing.trimEnd(), "", "// ---- appended by mutation agent ----"];

  let buffer = [];
  let capture = false;
  let braceDepth = 0;
  let blockName = null;

  const flushBuffer = () => {
    if (buffer.length === 0) return;
    if (!blockName || !existingKeys.has(blockName)) {
      output.push(buffer.join("\n"));
    }
    buffer = [];
    blockName = null;
    braceDepth = 0;
    capture = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!capture) {
      const m = line.match(/^(describe|it|test)\s*\(\s*([`'\"])([\s\S]*?)\2/);
      if (m) {
        blockName = `${m[1]}::${m[3]}`;
        capture = true;
        braceDepth += (line.match(/\{/g) || []).length;
        braceDepth -= (line.match(/\}/g) || []).length;
        buffer.push(line);
        if (braceDepth <= 0) {
          flushBuffer();
        }
      }
    } else {
      braceDepth += (line.match(/\{/g) || []).length;
      braceDepth -= (line.match(/\}/g) || []).length;
      buffer.push(line);
      if (braceDepth <= 0) {
        flushBuffer();
      }
    }
  }

  // Append any remaining non-block lines that are not duplicates
  if (buffer.length > 0) {
    flushBuffer();
  }

  return output.join("\n").trim() + "\n";
}


// Remove tests targeting specific export names (describe/it/test blocks that reference the names)
export function removeTestsForExports(existingContent, removedExportNames = []) {
  if (!existingContent || removedExportNames.length === 0) return existingContent || "";
  const namesPattern = removedExportNames.map(n => n.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|');

  const lines = existingContent.split(/\r?\n/);
  const out = [];
  let skip = false;
  let depth = 0;

  // Detect start of a describe/it/test whose title contains any of the names
  const startPattern = new RegExp(`^(describe|it|test)\\s*\\(\\s*([\"'\`])([^${String.fromCharCode(92, 50)}]*?(?:${namesPattern})[^${String.fromCharCode(92, 50)}]*?)${String.fromCharCode(92, 50)}`);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!skip) {
      if (startPattern.test(line)) {
        skip = true;
        depth = 0;
        depth += (line.match(/\{/g) || []).length;
        depth -= (line.match(/\}/g) || []).length;
        continue;
      }
      out.push(line);
    } else {
      depth += (line.match(/\{/g) || []).length;
      depth -= (line.match(/\}/g) || []).length;
      if (depth <= 0 && /\}\)\s*;?\s*$/.test(line)) {
        skip = false;
        continue;
      }
    }
  }
  return out.join("\n");
}


