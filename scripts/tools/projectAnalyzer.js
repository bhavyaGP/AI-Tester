import fs from "fs";
import path from "path";

/**
 * Dynamic project structure analyzer
 * Automatically detects project patterns and generates correct import paths
 */

export class ProjectStructureAnalyzer {
  constructor(projectRoot = process.cwd()) {
    this.projectRoot = projectRoot;
    this.structure = this.analyzeStructure();
  }

  analyzeStructure() {
    console.log("🏗️ Analyzing project structure...");
    
    const structure = {
      type: 'unknown',
      testDir: 'tests',
      srcDirs: [],
      patterns: {
        controllers: [],
        models: [],
        services: [],
        utils: [],
        config: []
      },
      packageType: this.detectPackageType()
    };

    // Find all directories and categorize them
    this.scanDirectories('', structure);
    
    // Detect project type based on structure
    structure.type = this.detectProjectType(structure);
    
    // Find or create test directory
    structure.testDir = this.findTestDirectory();
    
    console.log(`📁 Project type: ${structure.type}`);
    console.log(`🧪 Test directory: ${structure.testDir}`);
    console.log(`📦 Package type: ${structure.packageType}`);
    
    return structure;
  }

  detectPackageType() {
    try {
      const packageJsonPath = path.join(this.projectRoot, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        return packageJson.type || 'commonjs';
      }
    } catch (error) {
      console.warn(`⚠️ Could not read package.json: ${error.message}`);
    }
    return 'commonjs';
  }

  scanDirectories(currentPath, structure, depth = 0) {
    if (depth > 4) return; // Prevent infinite recursion
    
    const fullPath = path.join(this.projectRoot, currentPath);
    
    try {
      const items = fs.readdirSync(fullPath);
      
      for (const item of items) {
        if (item.startsWith('.') || item === 'node_modules') continue;
        
        const itemPath = path.join(fullPath, item);
        const relativePath = currentPath ? path.join(currentPath, item) : item;
        
        if (fs.statSync(itemPath).isDirectory()) {
          // Only include directories that should be tested
          if (this.shouldIncludeDirectory(relativePath)) {
            this.categorizeDirectory(relativePath, structure);
            this.scanDirectories(relativePath, structure, depth + 1);
          }
        }
      }
    } catch (error) {
      // Ignore permission errors
    }
  }

  /**
   * Determine if a directory should be included for testing
   */
  shouldIncludeDirectory(dirPath) {
    const dirName = path.basename(dirPath).toLowerCase();
    const fullPath = dirPath.toLowerCase();
    
    // Exclude common non-source directories
    const excludeDirs = [
      'node_modules', '.git', '.vscode', '.idea',
      'coverage', 'dist', 'build', 'out', 'tmp', 'temp',
      'logs', 'log', /* allow 'scripts' to be included for code under scripts */ 'docs', 'documentation',
      'assets', 'static', 'public', 'uploads'
    ];
    
    // Check if this directory or any parent should be excluded
    for (const excludeDir of excludeDirs) {
      if (dirName === excludeDir || fullPath.includes(excludeDir)) {
        return false;
      }
    }
    
    // Exclude test directories themselves
    if (fullPath.includes('test') || fullPath.includes('spec')) {
      return false;
    }
    
    // Include only directories that likely contain source code
    const sourceIndicators = [
      'server', 'src', 'lib', 'app', 'api', 'backend',
      'controller', 'model', 'service', 'middleware', 'scripts',
      'route', 'util', 'helper', 'config', 'component'
    ];
    
    // If it's a top-level directory, be more selective
    if (!dirPath.includes(path.sep)) {
      return sourceIndicators.some(indicator => 
        dirName.includes(indicator) || dirName === 'server'
      );
    }
    
    // For nested directories, include if parent was included
    return true;
  }

  categorizeDirectory(dirPath, structure) {
    const dirName = path.basename(dirPath).toLowerCase();
    const fullPath = dirPath.toLowerCase();
    
    // Add to source directories only if it should be included
    if (this.shouldIncludeDirectory(dirPath)) {
      structure.srcDirs.push(dirPath);
    }
    
    // Categorize by common patterns
    if (dirName.includes('controller') || fullPath.includes('controller')) {
      structure.patterns.controllers.push(dirPath);
    }
    
    if (dirName.includes('model') || fullPath.includes('model')) {
      structure.patterns.models.push(dirPath);
    }
    
    if (dirName.includes('service') || fullPath.includes('service')) {
      structure.patterns.services.push(dirPath);
    }
    
    if (dirName.includes('util') || dirName.includes('helper') || fullPath.includes('util')) {
      structure.patterns.utils.push(dirPath);
    }
    
    if (dirName.includes('config') || fullPath.includes('config')) {
      structure.patterns.config.push(dirPath);
    }
  }

  detectProjectType(structure) {
    // Check for common project types
    const dirs = structure.srcDirs.map(d => d.toLowerCase());
    
    if (dirs.some(d => d.includes('src/components') || d.includes('components'))) {
      return 'react';
    }
    
    if (dirs.some(d => d.includes('pages') && d.includes('api'))) {
      return 'nextjs';
    }
    
    if (structure.patterns.controllers.length > 0 && structure.patterns.models.length > 0) {
      return 'express-mvc';
    }
    
    if (dirs.some(d => d.includes('server') || d.includes('backend'))) {
      return 'fullstack';
    }
    
    if (dirs.some(d => d.includes('routes') || d.includes('controllers'))) {
      return 'express';
    }
    
    return 'node';
  }

  findTestDirectory() {
    const commonTestDirs = ['tests', 'test', '__tests__', 'spec'];
    
    for (const testDir of commonTestDirs) {
      const testPath = path.join(this.projectRoot, testDir);
      if (fs.existsSync(testPath)) {
        return testDir;
      }
    }
    
    // Default to 'tests' if none found
    return 'tests';
  }

  /**
   * Generate correct relative import path from test file to source file
   */
  getRelativeImportPath(testFilePath, sourceFilePath) {
    const testDir = path.dirname(testFilePath);
    let relativePath = path.relative(testDir, sourceFilePath);
    
    // Normalize path separators for cross-platform compatibility
    relativePath = relativePath.replace(/\\/g, '/');
    
    // Remove .js extension for imports
    if (relativePath.endsWith('.js')) {
      relativePath = relativePath.slice(0, -3);
    }
    
    // Ensure relative path starts with ./ or ../
    if (!relativePath.startsWith('.')) {
      relativePath = './' + relativePath;
    }
    
    return relativePath;
  }

  /**
   * Find the best location for a test file
   */
  getTestFilePath(sourceFilePath) {
    const relativePath = path.relative(this.projectRoot, sourceFilePath);
    const parsedPath = path.parse(relativePath);
    
    // Create test file path maintaining directory structure
    const testRelativePath = path.join(
      this.structure.testDir,
      parsedPath.dir,
      `${parsedPath.name}.test.js`
    );
    
    return path.join(this.projectRoot, testRelativePath);
  }

  /**
   * Find related files (models, utils, etc.) for a given source file
   */
  findRelatedFiles(sourceFilePath) {
    const related = {
      models: [],
      services: [],
      utils: [],
      config: []
    };
    
    const sourceDir = path.dirname(sourceFilePath);
    const sourceName = path.basename(sourceFilePath, '.js');
    
    // Find models in common model directories
    for (const modelDir of this.structure.patterns.models) {
      const modelPath = path.join(this.projectRoot, modelDir);
      try {
        const files = fs.readdirSync(modelPath);
        for (const file of files) {
          if (file.endsWith('.js') && file.includes('model')) {
            related.models.push(path.join(modelPath, file));
          }
        }
      } catch (error) {
        // Directory might not exist
      }
    }
    
    return related;
  }

  /**
   * Generate import statements for test files
   */
  generateImportStatements(testFilePath, sourceFilePath) {
    const imports = [];
    
    // Main controller/module import
    const relativePath = this.getRelativeImportPath(testFilePath, sourceFilePath);
    const moduleName = path.basename(sourceFilePath, '.js');
    
    // Try to detect exports from the source file
    try {
      const sourceContent = fs.readFileSync(sourceFilePath, 'utf8');
      const exports = this.extractExports(sourceContent);
      
      if (exports.length > 0) {
        if (this.structure.packageType === 'module') {
          imports.push(`import { ${exports.join(', ')} } from "${relativePath}";`);
        } else {
          imports.push(`const { ${exports.join(', ')} } = require("${relativePath}");`);
        }
      } else {
        if (this.structure.packageType === 'module') {
          imports.push(`import ${moduleName} from "${relativePath}";`);
        } else {
          imports.push(`const ${moduleName} = require("${relativePath}");`);
        }
      }
    } catch (error) {
      // Fallback import
      if (this.structure.packageType === 'module') {
        imports.push(`import ${moduleName} from "${relativePath}";`);
      } else {
        imports.push(`const ${moduleName} = require("${relativePath}");`);
      }
    }
    
    // Find and add related imports (models, etc.) only if they exist
    const related = this.findRelatedFiles(sourceFilePath);
    
    for (const modelPath of related.models) {
      if (!fs.existsSync(modelPath)) continue;
      const modelRelativePath = this.getRelativeImportPath(testFilePath, modelPath);
      const modelName = path.basename(modelPath, '.js');
      
      if (this.structure.packageType === 'module') {
        imports.push(`import ${modelName} from "${modelRelativePath}";`);
      } else {
        imports.push(`const ${modelName} = require("${modelRelativePath}");`);
      }
    }

    // Analyze source file's own imports and mock any missing relative modules
    try {
      const sourceContent = fs.readFileSync(sourceFilePath, 'utf8');
      const requireMatches = sourceContent.match(/require\(["']([^"']+)["']\)/g) || [];
      const importMatches = sourceContent.match(/from\s+["']([^"']+)["']/g) || [];

      const importStrings = [
        ...requireMatches.map(m => (m.match(/require\(["']([^"']+)["']\)/) || [])[1]).filter(Boolean),
        ...importMatches.map(m => (m.match(/from\s+["']([^"']+)["']/) || [])[1]).filter(Boolean)
      ];

      const sourceDir = path.dirname(sourceFilePath);

      for (const imp of importStrings) {
        // Only consider relative imports
        if (!imp.startsWith('./') && !imp.startsWith('../')) continue;

        // Resolve potential file paths (with and without .js)
        const resolved = path.resolve(sourceDir, imp);
        const candidates = [resolved, `${resolved}.js`, path.join(resolved, 'index.js')];
        const exists = candidates.some(p => fs.existsSync(p));

        if (!exists) {
          // Add a jest.mock for the exact import string used in the source file
          imports.unshift(`jest.mock("${imp}", () => ({ __esModule: true }));`);
        }
      }
    } catch {
      // If we can't read or parse, skip mocking
    }
    
    return imports;
  }

  extractExports(content) {
    const exports = [];
    
    // Extract named exports: export { name1, name2 }
    const namedExportMatches = content.match(/export\s*{([^}]+)}/g) || [];
    for (const match of namedExportMatches) {
      const names = match.match(/{([^}]+)}/)?.[1];
      if (names) {
        exports.push(...names.split(',').map(n => n.trim()));
      }
    }
    
    // Extract function exports: export function name()
    const functionExportMatches = content.match(/export\s+(?:async\s+)?function\s+(\w+)/g) || [];
    for (const match of functionExportMatches) {
      const name = match.match(/function\s+(\w+)/)?.[1];
      if (name) exports.push(name);
    }
    
    // Extract const exports: export const name =
    const constExportMatches = content.match(/export\s+const\s+(\w+)/g) || [];
    for (const match of constExportMatches) {
      const name = match.match(/const\s+(\w+)/)?.[1];
      if (name) exports.push(name);
    }
    
    // Extract module.exports for CommonJS (object literal)
    const moduleExportMatches = content.match(/module\.exports\s*=\s*{([^}]+)}/g) || [];
    for (const match of moduleExportMatches) {
      const names = match.match(/{([^}]+)}/)?.[1];
      if (names) {
        exports.push(...names.split(',').map(n => n.trim().split(':')[0]));
      }
    }

    // Extract CommonJS direct function/object export: module.exports = function name() {} OR anonymous
    const moduleExportsFunc = content.match(/module\.exports\s*=\s*(?:async\s+)?function\s*(\w+)?\s*\(/);
    if (moduleExportsFunc) {
      const fnName = moduleExportsFunc[1];
      if (fnName) exports.push(fnName);
    }

    // Extract individual assignments: module.exports.name = ...
    const propAssignMatches = content.match(/module\.exports\.(\w+)\s*=\s*/g) || [];
    for (const m of propAssignMatches) {
      const name = m.match(/module\.exports\.(\w+)/)?.[1];
      if (name) exports.push(name);
    }
    
    return [...new Set(exports)]; // Remove duplicates
  }
}

export function analyzeProjectStructure(projectRoot = process.cwd()) {
  return new ProjectStructureAnalyzer(projectRoot);
}