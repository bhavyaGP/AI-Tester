const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

class GitAnalyzer {
  constructor() {
    this.excludePatterns = [
      'node_modules',
      'coverage',
      'tests',
      'test',
      '__tests__',
      '.git',
      'dist',
      'build',
      'logs',
      'reports'
    ];
    
    this.includeExtensions = ['.js'];
    this.testFilePatterns = ['.test.js', '.spec.js', '_test.js', '_spec.js'];
  }

  getAllJSFiles() {
    try {
      const allFiles = execSync("git ls-files --cached --exclude-standard")
        .toString()
        .split("\n")
        .map(f => f.trim())
        .filter(Boolean);

      return allFiles.filter(file => this.isValidSourceFile(file));
    } catch (error) {
      throw new Error(`Failed to get all JS files: ${error.message}`);
    }
  }

  async analyzeChanges() {
    try {
      const changes = {
        changedFiles: [],
        deletedFiles: [],
        newFiles: [],
        modifiedFiles: [],
        rewrittenFiles: []
      };

      // Get all changes between HEAD~1 and HEAD
      const statusOutput = execSync("git diff --name-status HEAD~1 HEAD")
        .toString()
        .split("\n")
        .map(line => line.trim())
        .filter(Boolean);

      for (const line of statusOutput) {
        const [status, filename] = line.split('\t');
        
        if (!this.isValidSourceFile(filename)) continue;

        switch (status) {
          case 'A': // Added
            changes.newFiles.push(filename);
            changes.changedFiles.push(filename);
            break;
          case 'D': // Deleted
            changes.deletedFiles.push(filename);
            changes.changedFiles.push(filename);
            break;
          case 'M': // Modified
            const changeType = await this.analyzeModification(filename);
            if (changeType === 'rewritten') {
              changes.rewrittenFiles.push(filename);
            } else {
              changes.modifiedFiles.push({
                file: filename,
                changes: await this.getDetailedChanges(filename),
                changeType: changeType
              });
            }
            changes.changedFiles.push(filename);
            break;
          case 'R': // Renamed
            const [oldName, newName] = filename.split('\t');
            if (this.isValidSourceFile(oldName) && this.isValidSourceFile(newName)) {
              changes.deletedFiles.push(oldName);
              changes.newFiles.push(newName);
              changes.changedFiles.push(newName);
            }
            break;
        }
      }

      return changes;
    } catch (error) {
      throw new Error(`Failed to analyze changes: ${error.message}`);
    }
  }

  async analyzeModification(filename) {
    try {
      const diff = execSync(`git diff HEAD~1 HEAD -- "${filename}"`).toString();
      
      // Count lines added and removed
      const addedLines = (diff.match(/^\+[^+]/gm) || []).length;
      const removedLines = (diff.match(/^-[^-]/gm) || []).length;
      const totalLines = this.getFileLineCount(filename);
      
      // Calculate change percentage
      const changePercentage = ((addedLines + removedLines) / totalLines) * 100;
      
      // If more than 70% of the file changed, consider it rewritten
      if (changePercentage > 70) {
        return 'rewritten';
      }
      
      // Check if only meaningful changes (not just comments/whitespace)
      if (this.hasMeaningfulChanges(diff)) {
        return 'modified';
      }
      
      return 'cosmetic';
    } catch (error) {
      return 'modified'; // Default to modified if analysis fails
    }
  }

  async getDetailedChanges(filename) {
    try {
      const diff = execSync(`git diff HEAD~1 HEAD -- "${filename}"`).toString();
      
      const changes = {
        addedFunctions: [],
        modifiedFunctions: [],
        deletedFunctions: [],
        addedLines: [],
        deletedLines: [],
        contextLines: []
      };
      
      const lines = diff.split('\n');
      let currentHunk = null;
      let lineNumber = 0;
      
      for (const line of lines) {
        if (line.startsWith('@@')) {
          // Parse hunk header
          const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
          if (match) {
            currentHunk = {
              oldStart: parseInt(match[1]),
              newStart: parseInt(match[2])
            };
            lineNumber = currentHunk.newStart;
          }
        } else if (line.startsWith('+') && !line.startsWith('+++')) {
          changes.addedLines.push({
            line: line.substring(1),
            lineNumber: lineNumber++,
            context: this.extractContext(line.substring(1))
          });
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          changes.deletedLines.push({
            line: line.substring(1),
            lineNumber: lineNumber,
            context: this.extractContext(line.substring(1))
          });
        } else if (line.startsWith(' ')) {
          changes.contextLines.push({
            line: line.substring(1),
            lineNumber: lineNumber++
          });
        }
      }
      
      // Analyze function-level changes
      changes.addedFunctions = this.extractFunctionChanges(changes.addedLines, 'added');
      changes.deletedFunctions = this.extractFunctionChanges(changes.deletedLines, 'deleted');
      changes.modifiedFunctions = this.identifyModifiedFunctions(changes);
      
      return changes;
    } catch (error) {
      throw new Error(`Failed to get detailed changes for ${filename}: ${error.message}`);
    }
  }

  extractContext(line) {
    const trimmed = line.trim();
    
    // Function declarations
    if (trimmed.match(/^(function|async function|\w+\s*[:=]\s*(async\s+)?function)/)) {
      return { type: 'function', name: this.extractFunctionName(trimmed) };
    }
    
    // Class declarations
    if (trimmed.match(/^class\s+\w+/)) {
      return { type: 'class', name: this.extractClassName(trimmed) };
    }
    
    // Method declarations
    if (trimmed.match(/^\w+\s*\([^)]*\)\s*{/) || trimmed.match(/^async\s+\w+\s*\([^)]*\)\s*{/)) {
      return { type: 'method', name: this.extractMethodName(trimmed) };
    }
    
    // Variable declarations
    if (trimmed.match(/^(const|let|var)\s+\w+/)) {
      return { type: 'variable', name: this.extractVariableName(trimmed) };
    }
    
    // Export statements
    if (trimmed.match(/^(module\.exports|exports\.)/)) {
      return { type: 'export', name: this.extractExportName(trimmed) };
    }
    
    return { type: 'code', content: trimmed.substring(0, 50) };
  }

  extractFunctionChanges(lines, changeType) {
    const functions = [];
    
    for (const lineData of lines) {
      if (lineData.context && lineData.context.type === 'function') {
        functions.push({
          name: lineData.context.name,
          lineNumber: lineData.lineNumber,
          changeType: changeType,
          content: lineData.line
        });
      }
    }
    
    return functions;
  }

  identifyModifiedFunctions(changes) {
    const modified = [];
    
    // Group changes by function context
    const functionChanges = {};
    
    [...changes.addedLines, ...changes.deletedLines].forEach(lineData => {
      if (lineData.context && lineData.context.type === 'function') {
        const funcName = lineData.context.name;
        if (!functionChanges[funcName]) {
          functionChanges[funcName] = { added: [], deleted: [] };
        }
        
        if (changes.addedLines.includes(lineData)) {
          functionChanges[funcName].added.push(lineData);
        } else {
          functionChanges[funcName].deleted.push(lineData);
        }
      }
    });
    
    // Functions with both additions and deletions are considered modified
    Object.keys(functionChanges).forEach(funcName => {
      const changes = functionChanges[funcName];
      if (changes.added.length > 0 && changes.deleted.length > 0) {
        modified.push({
          name: funcName,
          addedLines: changes.added.length,
          deletedLines: changes.deleted.length,
          changeType: 'modified'
        });
      }
    });
    
    return modified;
  }

  extractFunctionName(line) {
    let match = line.match(/function\s+(\w+)/);
    if (match) return match[1];
    
    match = line.match(/(\w+)\s*[:=]\s*(async\s+)?function/);
    if (match) return match[1];
    
    match = line.match(/const\s+(\w+)\s*=\s*(async\s+)?function/);
    if (match) return match[1];
    
    return 'anonymous';
  }

  extractClassName(line) {
    const match = line.match(/class\s+(\w+)/);
    return match ? match[1] : 'unknown';
  }

  extractMethodName(line) {
    const match = line.match(/^(async\s+)?(\w+)\s*\(/);
    return match ? match[2] : 'unknown';
  }

  extractVariableName(line) {
    const match = line.match(/^(const|let|var)\s+(\w+)/);
    return match ? match[2] : 'unknown';
  }

  extractExportName(line) {
    let match = line.match(/module\.exports\s*=\s*(\w+)/);
    if (match) return match[1];
    
    match = line.match(/exports\.(\w+)/);
    if (match) return match[1];
    
    return 'unknown';
  }

  hasMeaningfulChanges(diff) {
    const lines = diff.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('+') || line.startsWith('-')) {
        const code = line.substring(1).trim();
        
        // Skip empty lines
        if (code === '') continue;
        
        // Skip comment changes
        if (code.startsWith('//') || code.startsWith('/*') || code.startsWith('*')) continue;
        
        // This is a meaningful change
        return true;
      }
    }
    
    return false;
  }

  getFileLineCount(filename) {
    try {
      if (fs.existsSync(filename)) {
        const content = fs.readFileSync(filename, 'utf8');
        return content.split('\n').length;
      }
      return 0;
    } catch (error) {
      return 0;
    }
  }

  isValidSourceFile(filename) {
    // Check if file has valid extension
    if (!this.includeExtensions.some(ext => filename.endsWith(ext))) {
      return false;
    }
    
    // Check if file is a test file
    if (this.testFilePatterns.some(pattern => filename.includes(pattern))) {
      return false;
    }
    
    // Check if file is in excluded directories
    if (this.excludePatterns.some(pattern => filename.includes(pattern))) {
      return false;
    }
    
    // Check if file exists and is readable
    try {
      if (fs.existsSync(filename)) {
        fs.accessSync(filename, fs.constants.R_OK);
        return true;
      }
    } catch (error) {
      return false;
    }
    
    return false;
  }

  getGitStatus() {
    try {
      const status = execSync("git status --porcelain").toString();
      return {
        hasUncommittedChanges: status.trim().length > 0,
        statusOutput: status
      };
    } catch (error) {
      throw new Error(`Failed to get git status: ${error.message}`);
    }
  }

  getCurrentBranch() {
    try {
      return execSync("git branch --show-current").toString().trim();
    } catch (error) {
      return 'main'; // Default fallback
    }
  }

  getCommitInfo() {
    try {
      const hash = execSync("git rev-parse HEAD").toString().trim();
      const message = execSync("git log -1 --pretty=%B").toString().trim();
      const author = execSync("git log -1 --pretty=%an").toString().trim();
      const date = execSync("git log -1 --pretty=%ad").toString().trim();
      
      return { hash, message, author, date };
    } catch (error) {
      return null;
    }
  }
}

module.exports = GitAnalyzer;

// If executed directly, print a summary of changes between HEAD~1 and HEAD
if (require.main === module) {
  (async () => {
    try {
      const git = new GitAnalyzer();
      const changes = await git.analyzeChanges();
      console.log('\u2705 Git analysis complete');
      console.log(JSON.stringify(changes, null, 2));
      process.exit(0);
    } catch (err) {
      console.error('\u274c Git analyzer failed:', err && err.message ? err.message : err);
      process.exit(1);
    }
  })();
}
