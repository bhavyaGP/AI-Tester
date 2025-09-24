import fs from "fs";
import path from "path";
import { execSync } from "child_process";

/**
 * Comprehensive dependency analyzer for Node.js projects
 * Automatically detects missing packages and installs them
 */

// Known Node.js built-in modules (don't need to be installed)
const BUILTIN_MODULES = new Set([
  'assert', 'async_hooks', 'buffer', 'child_process', 'cluster', 'console',
  'constants', 'crypto', 'dgram', 'dns', 'domain', 'events', 'fs', 'http',
  'http2', 'https', 'inspector', 'module', 'net', 'os', 'path', 'perf_hooks',
  'process', 'punycode', 'querystring', 'readline', 'repl', 'stream',
  'string_decoder', 'sys', 'timers', 'tls', 'trace_events', 'tty', 'url',
  'util', 'v8', 'vm', 'worker_threads', 'zlib'
]);

// Known development dependencies patterns
const DEV_DEPENDENCY_PATTERNS = new Set([
  'jest', '@jest/', 'babel', '@babel/', 'webpack', '@webpack/',
  'eslint', '@eslint/', 'prettier', 'typescript', '@types/',
  'nodemon', 'ts-node', 'rollup', 'vite', 'parcel',
  'mocha', 'chai', 'sinon', 'supertest', 'cypress',
  'karma', 'jasmine', 'ava', 'tap', 'nyc',
  'husky', 'lint-staged', 'commitlint', '@commitlint/',
  'storybook', '@storybook/', 'playwright', '@playwright/'
]);

export class DependencyAnalyzer {
  constructor(projectRoot = process.cwd()) {
    this.projectRoot = projectRoot;
    this.packageJsonPath = path.join(projectRoot, 'package.json');
    this.existingDependencies = new Set();
    this.existingDevDependencies = new Set();
    this.detectedDependencies = new Set();
    this.detectedDevDependencies = new Set();
    this.loadExistingPackages();
  }

  loadExistingPackages() {
    try {
      if (fs.existsSync(this.packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
        
        if (packageJson.dependencies) {
          Object.keys(packageJson.dependencies).forEach(dep => 
            this.existingDependencies.add(dep)
          );
        }
        
        if (packageJson.devDependencies) {
          Object.keys(packageJson.devDependencies).forEach(dep => 
            this.existingDevDependencies.add(dep)
          );
        }
      }
    } catch (error) {
      console.warn(`⚠️ Could not load package.json: ${error.message}`);
    }
  }

  /**
   * Analyze the entire project for missing dependencies
   */
  async analyzeProject() {
    console.log("🔍 Scanning project for dependencies...");
    
    const results = {
      scannedFiles: 0,
      detectedImports: 0,
      missingPackages: [],
      existingPackages: this.existingDependencies.size + this.existingDevDependencies.size
    };

    try {
      await this.scanDirectory(this.projectRoot, results);
      
      // Find missing packages
      const missingDeps = this.findMissingPackages();
      results.missingPackages = missingDeps;
      
      console.log(`📊 Analysis complete: ${results.scannedFiles} files, ${results.detectedImports} imports, ${missingDeps.length} missing packages`);
      
      return results;
    } catch (error) {
      console.error(`❌ Analysis failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Recursively scan directory for JavaScript/TypeScript files
   */
  async scanDirectory(dirPath, results, depth = 0) {
    if (depth > 4) return; // Prevent deep recursion
    
    const excludeDirs = ['node_modules', '.git', 'coverage', 'dist', 'build'];
    
    try {
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        if (excludeDirs.includes(item)) continue;
        
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          await this.scanDirectory(fullPath, results, depth + 1);
        } else if (this.isJavaScriptFile(item)) {
          await this.scanFile(fullPath, results);
        }
      }
    } catch (error) {
      // Skip directories we can't read
      console.warn(`⚠️ Could not scan directory: ${dirPath}`);
    }
  }

  /**
   * Check if file is a JavaScript/TypeScript file we should scan
   */
  isJavaScriptFile(filename) {
    const extensions = ['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs'];
    return extensions.some(ext => filename.endsWith(ext));
  }

  /**
   * Scan individual file for import/require statements
   */
  async scanFile(filePath, results) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const imports = this.extractImports(content);
      
      results.scannedFiles++;
      results.detectedImports += imports.length;
      
      // Categorize each import
      for (const importPath of imports) {
        this.categorizeImport(importPath);
      }
      
    } catch (error) {
      console.warn(`⚠️ Could not scan file: ${filePath}`);
    }
  }

  /**
   * Extract import/require statements from file content
   */
  extractImports(content) {
    const imports = [];
    
    // ES6 import patterns
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    
    // Dynamic import patterns
    const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = dynamicImportRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    
    // CommonJS require patterns
    const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = requireRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    
    return imports;
  }

  /**
   * Categorize import as dependency or devDependency
   */
  categorizeImport(importPath) {
    // Skip relative imports and built-in modules
    if (importPath.startsWith('.') || importPath.startsWith('/') || BUILTIN_MODULES.has(importPath)) {
      return;
    }
    
    // Skip template variables and invalid imports
    if (importPath.includes('${') || importPath.includes('`') || importPath.includes('[') || importPath.includes('{')) {
      return;
    }
    
    // Extract package name (handle scoped packages)
    const packageName = this.extractPackageName(importPath);
    
    // Skip empty or invalid package names
    if (!packageName || packageName.length === 0) {
      return;
    }
    
    // Skip if already installed
    if (this.existingDependencies.has(packageName) || this.existingDevDependencies.has(packageName)) {
      return;
    }
    
    // Categorize as dev or regular dependency
    const isDev = this.isDevDependency(packageName);
    
    if (isDev) {
      this.detectedDevDependencies.add(packageName);
    } else {
      this.detectedDependencies.add(packageName);
    }
  }

  /**
   * Extract package name from import path
   */
  extractPackageName(importPath) {
    // Handle scoped packages (@scope/package)
    if (importPath.startsWith('@')) {
      const parts = importPath.split('/');
      return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : importPath;
    }
    
    // Regular packages
    return importPath.split('/')[0];
  }

  /**
   * Determine if package should be a devDependency
   */
  isDevDependency(packageName) {
    return Array.from(DEV_DEPENDENCY_PATTERNS).some(pattern => 
      packageName.includes(pattern) || packageName.startsWith(pattern)
    );
  }

  /**
   * Find packages that are imported but not installed
   */
  findMissingPackages() {
    const missing = [];
    
    // Add missing regular dependencies
    for (const dep of this.detectedDependencies) {
      if (!this.existingDependencies.has(dep)) {
        missing.push({ name: dep, type: 'dependency' });
      }
    }
    
    // Add missing dev dependencies
    for (const dep of this.detectedDevDependencies) {
      if (!this.existingDevDependencies.has(dep)) {
        missing.push({ name: dep, type: 'devDependency' });
      }
    }
    
    return missing;
  }

  /**
   * Install missing packages automatically
   */
  async installMissingPackages() {
    const missingPackages = this.findMissingPackages();
    
    if (missingPackages.length === 0) {
      console.log("✅ No missing packages to install");
      return true;
    }
    
    console.log(`📥 Installing ${missingPackages.length} missing packages...`);
    
    // Group by dependency type
    const regularDeps = missingPackages.filter(p => p.type === 'dependency').map(p => p.name);
    const devDeps = missingPackages.filter(p => p.type === 'devDependency').map(p => p.name);
    
    try {
      // Install regular dependencies
      if (regularDeps.length > 0) {
        await this.installPackages(regularDeps, 'production');
      }
      
      // Install dev dependencies
      if (devDeps.length > 0) {
        await this.installPackages(devDeps, 'dev');
      }
      
      console.log("✅ All missing packages installed successfully");
      return true;
      
    } catch (error) {
      console.error(`❌ Package installation failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Install packages using npm or bun
   */
  async installPackages(packages, type = 'production') {
    if (packages.length === 0) return true;
    
    const packageManager = this.detectPackageManager();
    const devFlag = type === 'dev' ? (packageManager === 'bun' ? '--dev' : '--save-dev') : '';
    
    console.log(`📦 Installing ${type} packages: ${packages.join(', ')}`);
    
    try {
      const command = `${packageManager} ${packageManager === 'bun' ? 'add' : 'install'} ${devFlag} ${packages.join(' ')}`;
      console.log(`🔧 Running: ${command}`);
      
      execSync(command, {
        cwd: this.projectRoot,
        stdio: 'pipe',
        encoding: 'utf8'
      });
      
      console.log(`✅ Successfully installed ${packages.length} ${type} packages`);
      
      // Update our internal tracking
      if (type === 'dev') {
        packages.forEach(pkg => this.existingDevDependencies.add(pkg));
      } else {
        packages.forEach(pkg => this.existingDependencies.add(pkg));
      }
      
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to install packages: ${error.message}`);
      throw error;
    }
  }

  /**
   * Detect which package manager to use
   */
  detectPackageManager() {
    // Check for bun.lock
    if (fs.existsSync(path.join(this.projectRoot, 'bun.lock'))) {
      return 'bun';
    }
    
    // Check for package-lock.json
    if (fs.existsSync(path.join(this.projectRoot, 'package-lock.json'))) {
      return 'npm';
    }
    
    // Check for yarn.lock
    if (fs.existsSync(path.join(this.projectRoot, 'yarn.lock'))) {
      return 'yarn';
    }
    
    // Default to npm
    return 'npm';
  }

  /**
   * Get comprehensive analysis report
   */
  getAnalysisReport() {
    return {
      projectRoot: this.projectRoot,
      packageManager: this.detectPackageManager(),
      existingDependencies: Array.from(this.existingDependencies),
      existingDevDependencies: Array.from(this.existingDevDependencies),
      detectedDependencies: Array.from(this.detectedDependencies),
      detectedDevDependencies: Array.from(this.detectedDevDependencies),
      missingPackages: this.findMissingPackages()
    };
  }
}

// Convenience functions for direct usage
export async function analyzeDependencies(projectRoot = process.cwd()) {
  const analyzer = new DependencyAnalyzer(projectRoot);
  return await analyzer.analyzeProject();
}

export async function installMissingDependencies(projectRoot = process.cwd()) {
  const analyzer = new DependencyAnalyzer(projectRoot);
  const analysis = await analyzer.analyzeProject();
  
  if (analysis.missingPackages.length > 0) {
    return await analyzer.installMissingPackages();
  }
  
  return true;
}