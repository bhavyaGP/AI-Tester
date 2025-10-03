// New implementation
import fs from "fs";
import recast from "recast";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import generate from "@babel/generator";

/**
 * Parser options for JS/TS support.
 */
const PARSER_OPTIONS = {
  sourceType: "module",
  plugins: [
    "jsx",
    "classProperties",
    "optionalChaining",
    "nullishCoalescingOperator",
    "objectRestSpread",
    "dynamicImport",
    "bigInt",
    "topLevelAwait",
  ],
};

/**
 * Parse code into an AST using babel (via recast).
 */
function parseToAst(code) {
  return recast.parse(code, {
    parser: {
      parse(source) {
        return parse(source, PARSER_OPTIONS);
      },
    },
  });
}

/**
 * Helper: extract top-level test blocks from AST.
 * Returns map: key -> { node, title, rawTitle, start, end }
 * Key chosen: `${type}::${title}` where type is describe|it|test
 */
function extractTopLevelTestBlocks(ast) {
  const blocks = new Map();

  traverse(ast, {
    // Only top-level CallExpressions (i.e., not nested inside other functions)
    enter(path) {
      const { node } = path;
      if (
        node &&
        node.type === "ExpressionStatement" &&
        node.expression &&
        node.expression.type === "CallExpression"
      ) {
        const callee = node.expression.callee;
        let fnName = null;
        if (callee.type === "Identifier" && ["describe", "it", "test"].includes(callee.name)) {
          fnName = callee.name;
        } else if (
          callee.type === "MemberExpression" &&
          callee.object &&
          ["describe", "it", "test"].includes(callee.object.name)
        ) {
          // e.g., describe.skip(...)
          fnName = callee.object.name;
        }
        if (fnName) {
          const args = node.expression.arguments;
          if (args && args.length > 0) {
            const first = args[0];
            if (first.type === "StringLiteral" || first.type === "Literal") {
              const title = first.value;
              const key = `${fnName}::${title}`;
              // store whole node for later removal or comparison
              blocks.set(key, { node, title, fnName });
            } else if (first.type === "TemplateLiteral" && first.quasis && first.quasis.length === 1) {
              // simple template literal without expressions
              const title = first.quasis[0].value.cooked;
              const key = `${fnName}::${title}`;
              blocks.set(key, { node, title, fnName });
            }
          }
        }
      }
      // stop traversal into nested function bodies to keep "top-level" only
      if (
        path.parentPath &&
        (path.parentPath.node.type === "FunctionExpression" ||
          path.parentPath.node.type === "ArrowFunctionExpression" ||
          path.parentPath.node.type === "FunctionDeclaration")
      ) {
        path.skip();
      }
    },
  });

  return blocks;
}

/**
 * Simple Python test block extractor using regex.
 * Looks for top-level describe/it/test calls.
 */
function extractPythonTestBlocks(content) {
  const blocks = [];
  const lines = content.split(/\r?\n/);
  const regex = /^\s*(describe|it|test)\s*\(\s*["']([^"']+)["']\s*,?\s*\)\s*\{/;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(regex);
    if (match) {
      const fnName = match[1];
      const title = match[2];
      const key = `${fnName}::${title}`;
      // Find the end of the block
      let braceCount = 1;
      let endLine = i;
      for (let j = i + 1; j < lines.length; j++) {
        braceCount += (lines[j].match(/\{/g) || []).length;
        braceCount -= (lines[j].match(/\}/g) || []).length;
        if (braceCount === 0) {
          endLine = j;
          break;
        }
      }
      const text = lines.slice(i, endLine + 1).join('\n');
      blocks.push({ key, fnName, title, startIndex: content.indexOf(lines[i]), endIndex: content.indexOf(lines[endLine]) + lines[endLine].length, text });
    }
  }
  return blocks;
}

/**
 * Smart merge for incremental test content with function-specific handling
 */
export function mergeIncrementalTests(existingContent, newContent, targetFunctions = [], language = "auto") {
  const existing = existingContent || "";
  const incoming = newContent || "";

  if (!existing.trim()) return incoming;
  if (!incoming.trim()) return existing;

  console.log(`🔧 Merging tests for functions: ${targetFunctions.join(', ') || 'all'}`);

  const lang = language.toLowerCase();
  if (lang === "python" || lang === "py") {
    return mergeTestContentsPython(existing, incoming, targetFunctions);
  } else {
    return mergeTestContentsJavaScript(existing, incoming, targetFunctions);
  }
}

function mergeTestContentsPython(existing, incoming, targetFunctions) {
  const existingBlocks = extractPythonTestBlocks(existing);
  const incomingBlocks = extractPythonTestBlocks(incoming);

  if (incomingBlocks.length === 0) {
    if (existing.includes(incoming.trim())) return existing;
    return existing.trimEnd() + "\n\n// ---- appended ----\n" + incoming.trim() + "\n";
  }

  const existingKeys = new Set(existingBlocks.map((block) => block.key));
  const fragments = [];

  for (const block of incomingBlocks) {
    // If we have target functions, only include tests that match
    if (targetFunctions.length > 0) {
      const matchesTarget = targetFunctions.some(func => 
        block.title.toLowerCase().includes(func.toLowerCase())
      );
      if (!matchesTarget) continue;
    }

    if (!existingKeys.has(block.key)) {
      fragments.push(block.text.trimEnd());
    }
  }

  if (fragments.length === 0) return existing;

  return existing.trimEnd() + "\n\n// ---- appended by incremental agent ----\n" + fragments.join("\n\n") + "\n";
}

function mergeTestContentsJavaScript(existing, incoming, targetFunctions) {
  try {
    const astExisting = parseToAst(existing);
    const astIncoming = parseToAst(incoming);

    const existingBlocks = extractTopLevelTestBlocks(astExisting);
    const incomingBlocks = extractTopLevelTestBlocks(astIncoming);

    // If there are no extractable blocks in incoming, filter and append
    if (incomingBlocks.size === 0) {
      // If we have target functions, try to filter the incoming content
      if (targetFunctions.length > 0) {
        const filteredContent = filterContentByFunctions(incoming, targetFunctions);
        if (existing.includes(filteredContent.trim())) return existing;
        return existing.trimEnd() + "\n\n// ---- appended ----\n" + filteredContent.trim() + "\n";
      }
      
      if (existing.includes(incoming.trim())) return existing;
      return existing.trimEnd() + "\n\n// ---- appended ----\n" + incoming.trim() + "\n";
    }

    // Collect nodes (AST nodes) to append, filtered by target functions
    const nodesToAppend = [];
    traverse(astIncoming, {
      enter(path) {
        const { node } = path;
        if (
          node &&
          node.type === "ExpressionStatement" &&
          node.expression &&
          node.expression.type === "CallExpression"
        ) {
          const callee = node.expression.callee;
          let fnName = null;
          if (callee.type === "Identifier" && ["describe", "it", "test"].includes(callee.name)) {
            fnName = callee.name;
          } else if (
            callee.type === "MemberExpression" &&
            callee.object &&
            ["describe", "it", "test"].includes(callee.object.name)
          ) {
            fnName = callee.object.name;
          }
          if (fnName) {
            const args = node.expression.arguments;
            if (args && args.length > 0) {
              const first = args[0];
              let title = null;
              if (first.type === "StringLiteral" || first.type === "Literal") title = first.value;
              else if (first.type === "TemplateLiteral" && first.quasis && first.quasis.length === 1)
                title = first.quasis[0].value.cooked;
              if (title) {
                const key = `${fnName}::${title}`;
                
                // Check if this test should be included based on target functions
                if (targetFunctions.length > 0) {
                  const matchesTarget = targetFunctions.some(func => 
                    title.toLowerCase().includes(func.toLowerCase())
                  );
                  if (!matchesTarget) return;
                }
                
                if (!existingBlocks.has(key)) {
                  nodesToAppend.push(node);
                }
              }
            }
          }
        }
        // avoid going deeper
        if (
          path.parentPath &&
          (path.parentPath.node.type === "FunctionExpression" ||
            path.parentPath.node.type === "ArrowFunctionExpression" ||
            path.parentPath.node.type === "FunctionDeclaration")
        ) {
          path.skip();
        }
      },
    });

    // If nothing to append, return existing
    if (nodesToAppend.length === 0) return existing;

    // Generate appended code
    const appendedCodeFragments = nodesToAppend.map((n) => generate(n).code);
    const appendedBlock = appendedCodeFragments.join("\n\n");

    return existing.trimEnd() + "\n\n// ---- appended by incremental agent ----\n" + appendedBlock + "\n";
  } catch (err) {
    // On parse failure fallback to conservative append
    console.warn("mergeIncrementalTests AST parse failed, falling back to naive merge:", err?.message || err);
    
    if (targetFunctions.length > 0) {
      const filteredContent = filterContentByFunctions(incoming, targetFunctions);
      if (existing.includes(filteredContent.trim())) return existing;
      return existing.trimEnd() + "\n\n// ---- appended by incremental agent ----\n" + filteredContent.trim() + "\n";
    }
    
    if (existing.includes(incoming.trim())) return existing;
    return existing.trimEnd() + "\n\n// ---- appended by incremental agent ----\n" + incoming.trim() + "\n";
  }
}

function filterContentByFunctions(content, targetFunctions) {
  if (!targetFunctions.length) return content;
  
  const lines = content.split('\n');
  const filteredLines = [];
  let includeBlock = false;
  let braceDepth = 0;
  
  for (const line of lines) {
    // Check if this line starts a test block for one of our target functions
    const testBlockMatch = line.match(/^\s*(?:describe|it|test)\s*\(\s*["']([^"']+)["']/);
    if (testBlockMatch) {
      const title = testBlockMatch[1];
      includeBlock = targetFunctions.some(func => 
        title.toLowerCase().includes(func.toLowerCase())
      );
      braceDepth = 0;
    }
    
    if (includeBlock) {
      filteredLines.push(line);
      
      // Track brace depth to know when the test block ends
      braceDepth += (line.match(/\{/g) || []).length;
      braceDepth -= (line.match(/\}/g) || []).length;
      
      if (braceDepth <= 0) {
        includeBlock = false;
      }
    }
  }
  
  return filteredLines.join('\n');
}

/**
 * Merge incoming test content into existing content conservatively:
 * - If existing is empty -> return incoming
 * - Parse both, extract top-level describe/it/test titles and append only those
 *   blocks from incoming not present in existing.
 */
export function mergeTestContents(existingContent, newContent, language = "auto") {
  const existing = existingContent || "";
  const incoming = newContent || "";

  if (!existing.trim()) return incoming;
  if (!incoming.trim()) return existing;

  const lang = language.toLowerCase();
  if (lang === "python" || lang === "py") {
    // Use regex for Python
    const existingBlocks = extractPythonTestBlocks(existing);
    const incomingBlocks = extractPythonTestBlocks(incoming);

    if (incomingBlocks.length === 0) {
      if (existing.includes(incoming.trim())) return existing;
      return existing.trimEnd() + "\n\n// ---- appended ----\n" + incoming.trim() + "\n";
    }

    const existingKeys = new Set(existingBlocks.map((block) => block.key));
    const fragments = [];

    for (const block of incomingBlocks) {
      if (!existingKeys.has(block.key)) {
        fragments.push(block.text.trimEnd());
      }
    }

    if (fragments.length === 0) return existing;

    return existing.trimEnd() + "\n\n// ---- appended by mutation agent ----\n" + fragments.join("\n\n") + "\n";
  } else {
    // Use Babel for JS/TS
    try {
      const astExisting = parseToAst(existing);
      const astIncoming = parseToAst(incoming);

      const existingBlocks = extractTopLevelTestBlocks(astExisting);
      const incomingBlocks = extractTopLevelTestBlocks(astIncoming);

      // If there are no extractable blocks in incoming, just append incoming raw but avoid duplication
      if (incomingBlocks.size === 0) {
        // naive append if incoming not already present
        if (existing.includes(incoming.trim())) return existing;
        return existing.trimEnd() + "\n\n// ---- appended ----\n" + incoming.trim() + "\n";
      }

      // Collect nodes (AST nodes) to append
      const nodesToAppend = [];
      traverse(astIncoming, {
        enter(path) {
          const { node } = path;
          if (
            node &&
            node.type === "ExpressionStatement" &&
            node.expression &&
            node.expression.type === "CallExpression"
          ) {
            const callee = node.expression.callee;
            let fnName = null;
            if (callee.type === "Identifier" && ["describe", "it", "test"].includes(callee.name)) {
              fnName = callee.name;
            } else if (
              callee.type === "MemberExpression" &&
              callee.object &&
              ["describe", "it", "test"].includes(callee.object.name)
            ) {
              fnName = callee.object.name;
            }
            if (fnName) {
              const args = node.expression.arguments;
              if (args && args.length > 0) {
                const first = args[0];
                let title = null;
                if (first.type === "StringLiteral" || first.type === "Literal") title = first.value;
                else if (first.type === "TemplateLiteral" && first.quasis && first.quasis.length === 1)
                  title = first.quasis[0].value.cooked;
                if (title) {
                  const key = `${fnName}::${title}`;
                  if (!existingBlocks.has(key)) {
                    nodesToAppend.push(node);
                  }
                }
              }
            }
          }
          // avoid going deeper
          if (
            path.parentPath &&
            (path.parentPath.node.type === "FunctionExpression" ||
              path.parentPath.node.type === "ArrowFunctionExpression" ||
              path.parentPath.node.type === "FunctionDeclaration")
          ) {
            path.skip();
          }
        },
      });

      // If nothing to append, return existing
      if (nodesToAppend.length === 0) return existing;

      // Generate appended code
      const appendedCodeFragments = nodesToAppend.map((n) => generate(n).code);
      const appendedBlock = appendedCodeFragments.join("\n\n");

      return existing.trimEnd() + "\n\n// ---- appended by mutation agent ----\n" + appendedBlock + "\n";
    } catch (err) {
      // On parse failure fallback to conservative append
      console.warn("mergeTestContents AST parse failed, falling back to naive merge:", err?.message || err);
      if (existing.includes(incoming.trim())) return existing;
      return existing.trimEnd() + "\n\n// ---- appended by mutation agent ----\n" + incoming.trim() + "\n";
    }
  }
}

/**
 * Remove describe/it/test blocks whose title contains any of the removed export names.
 * This function returns the new content (string).
 */
export function removeTestsForExports(existingContent, removedExportNames = [], language = "auto") {
  if (!existingContent) return "";
  if (!removedExportNames || removedExportNames.length === 0) return existingContent;

  const lang = language.toLowerCase();
  if (lang === "python" || lang === "py") {
    // Use regex for Python
    const blocks = extractPythonTestBlocks(existingContent);
    if (!blocks.length) return existingContent;

    const namesLower = removedExportNames.map((n) => n.toLowerCase()).filter(Boolean);
    if (!namesLower.length) return existingContent;

    const ranges = [];

    for (const block of blocks) {
      if (containsRemovedName(block.title, namesLower)) {
        ranges.push({ start: block.startIndex, end: block.endIndex });
      }
    }

    if (!ranges.length) return existingContent;

    ranges.sort((a, b) => b.start - a.start);

    let output = existingContent;
    for (const range of ranges) {
      output = output.slice(0, range.start) + output.slice(range.end);
    }

    return collapseBlankLines(output);
  } else {
    // Use Babel for JS/TS
    // Build word boundary pattern for quick check
    const namesLower = removedExportNames.map((n) => n.toLowerCase());

    try {
      const ast = parseToAst(existingContent);
      let modified = false;

      traverse(ast, {
        enter(path) {
          const { node } = path;
          if (
            node &&
            node.type === "ExpressionStatement" &&
            node.expression &&
            node.expression.type === "CallExpression"
          ) {
            const callee = node.expression.callee;
            let fnName = null;
            if (callee.type === "Identifier" && ["describe", "it", "test"].includes(callee.name)) {
              fnName = callee.name;
            } else if (
              callee.type === "MemberExpression" &&
              callee.object &&
              ["describe", "it", "test"].includes(callee.object.name)
            ) {
              fnName = callee.object.name;
            }
            if (fnName) {
              const args = node.expression.arguments;
              if (args && args.length > 0) {
                const first = args[0];
                let title = null;
                if (first.type === "StringLiteral" || first.type === "Literal") title = first.value;
                else if (first.type === "TemplateLiteral" && first.quasis && first.quasis.length === 1)
                  title = first.quasis[0].value.cooked;
                if (title) {
                  const lower = String(title).toLowerCase();
                  // if title contains any removed export name as whole word -> remove node
                  for (const rm of namesLower) {
                    // check word boundary to avoid partial matches
                    const re = new RegExp(`\\b${escapeRegExp(rm)}\\b`, "i");
                    if (re.test(lower)) {
                      path.remove();
                      modified = true;
                      break;
                    }
                  }
                }
              }
            }
          }
        },
      });

      if (!modified) return existingContent;

      // Print back code
      const output = recast.print(ast).code;
      return output;
    } catch (err) {
      console.warn("removeTestsForExports AST parse failed, falling back to regex removal:", err?.message || err);
      // Fallback: naive regex lines removal (less safe)
      let lines = existingContent.split(/\r?\n/);
      const out = [];
      let skip = false;
      let depth = 0;
      const namesPattern = removedExportNames.map(n => escapeRegExp(n)).join("|");
      const startPattern = new RegExp(`^(?:describe|it|test)\\s*\\(\\s*(['"\`])(?=[\\s\\S]*(${namesPattern}))`, "i");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!skip) {
          if (startPattern.test(line)) {
            skip = true;
            depth = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
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
  }
}

/* Utility */
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsRemovedName(title, namesLower) {
  if (!title) return false;
  const lower = title.toLowerCase();
  return namesLower.some((name) => {
    const re = new RegExp(`\\b${escapeRegExp(name)}\\b`, "i");
    return re.test(lower);
  });
}

function collapseBlankLines(text) {
  const normalized = text.replace(/\n{3,}/g, "\n\n").trimEnd();
  if (!normalized.trim()) {
    return normalized;
  }
  return normalized.endsWith("\n") ? normalized : normalized + "\n";
}