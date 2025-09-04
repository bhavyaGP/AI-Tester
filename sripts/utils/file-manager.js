const fs = require("fs");
const path = require("path");
const winston = require("winston");

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.simple()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

class FileManager {
  constructor() {
    this.testDirectory = "tests";
    this.sourceDirectories = ["server", "src"];
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
      'reports',
      'sripts' // Exclude the scripts directory itself
    ];
    
    this.testFilePatterns = ['.test.js', '.spec.js', '_test.js', '_spec.js'];
    this.backupDirectory = "test-backups";
  }

  async writeTestFile(sourceFilePath, testContent) {
    try {
      const testFilePath = this.getTestFilePath(sourceFilePath);
      const testDir = path.dirname(testFilePath);
      
      // Create test directory if it doesn't exist
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
        logger.info(`📁 Created test directory: ${testDir}`);
      }
      
      // Backup existing test file if it exists
      if (fs.existsSync(testFilePath)) {
        await this.backupTestFile(testFilePath);
      }
      
      // Write new test content
      fs.writeFileSync(testFilePath, testContent, 'utf8');
      logger.info(`✅ Test file written: ${testFilePath}`);
      
      return testFilePath;
      
    } catch (error) {
      logger.error(`❌ Failed to write test file for ${sourceFilePath}:`, error.message);
      throw error;
    }
  }

  async updateTestFile(sourceFilePath, testContent) {
    try {
      const testFilePath = this.getTestFilePath(sourceFilePath);
      
      if (!fs.existsSync(testFilePath)) {
        logger.info(`📝 Test file doesn't exist, creating new one: ${testFilePath}`);
        return this.writeTestFile(sourceFilePath, testContent);
      }
      
      // Backup existing test file
      await this.backupTestFile(testFilePath);
      
      // Write updated content
      fs.writeFileSync(testFilePath, testContent, 'utf8');
      logger.info(`🔄 Test file updated: ${testFilePath}`);
      
      return testFilePath;
      
    } catch (error) {
      logger.error(`❌ Failed to update test file for ${sourceFilePath}:`, error.message);
      throw error;
    }
  }

  async deleteTestFile(sourceFilePath) {
    try {
      const testFilePath = this.getTestFilePath(sourceFilePath);
      
      if (fs.existsSync(testFilePath)) {
        // Backup before deletion
        await this.backupTestFile(testFilePath);
        
        fs.unlinkSync(testFilePath);
        logger.info(`🗑️ Test file deleted: ${testFilePath}`);
        
        // Clean up empty directories
        this.cleanupEmptyDirectories(path.dirname(testFilePath));
      } else {
        logger.info(`⚠️ Test file not found for deletion: ${testFilePath}`);
      }
      
    } catch (error) {
      logger.error(`❌ Failed to delete test file for ${sourceFilePath}:`, error.message);
      throw error;
    }
  }

  async backupTestFile(testFilePath) {
    try {
      if (!fs.existsSync(testFilePath)) {
        return;
      }
      
      const backupDir = path.join(this.backupDirectory, new Date().toISOString().split('T')[0]);
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = path.basename(testFilePath, '.js');
      const backupFileName = `${fileName}-${timestamp}.js`;
      const backupPath = path.join(backupDir, backupFileName);
      
      fs.copyFileSync(testFilePath, backupPath);
      logger.info(`💾 Test file backed up: ${backupPath}`);
      
    } catch (error) {
      logger.warn(`⚠️ Failed to backup test file ${testFilePath}:`, error.message);
    }
  }

  getTestFilePath(sourceFilePath) {
    // Convert source file path to test file path
    const relativePath = this.getRelativeSourcePath(sourceFilePath);
    const testFileName = this.generateTestFileName(path.basename(relativePath));
    const testDir = path.join(this.testDirectory, path.dirname(relativePath));
    
    return path.join(testDir, testFileName);
  }

  getRelativeSourcePath(sourceFilePath) {
    // Remove leading directory separators and normalize path
    let relativePath = sourceFilePath.replace(/^[\/\\]+/, '');
    
    // Convert Windows paths to Unix style for consistency
    relativePath = relativePath.replace(/\\/g, '/');
    
    return relativePath;
  }

  generateTestFileName(sourceFileName) {
    const baseName = path.basename(sourceFileName, path.extname(sourceFileName));
    return `${baseName}.test.js`;
  }

  getExistingTestFiles() {
    const testFiles = [];
    
    if (!fs.existsSync(this.testDirectory)) {
      return testFiles;
    }
    
    this.walkDirectory(this.testDirectory, (filePath) => {
      if (this.isTestFile(filePath)) {
        testFiles.push(filePath);
      }
    });
    
    return testFiles;
  }

  getAllSourceFiles() {
    const sourceFiles = [];
    
    this.sourceDirectories.forEach(dir => {
      if (fs.existsSync(dir)) {
        this.walkDirectory(dir, (filePath) => {
          if (this.isValidSourceFile(filePath)) {
            sourceFiles.push(filePath);
          }
        });
      }
    });
    
    return sourceFiles;
  }

  walkDirectory(dirPath, callback) {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      
      entries.forEach(entry => {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          // Skip excluded directories
          if (!this.excludePatterns.some(pattern => entry.name.includes(pattern))) {
            this.walkDirectory(fullPath, callback);
          }
        } else if (entry.isFile()) {
          callback(fullPath);
        }
      });
      
    } catch (error) {
      logger.warn(`⚠️ Failed to read directory ${dirPath}:`, error.message);
    }
  }

  isValidSourceFile(filePath) {
    // Check if file has .js extension
    if (!filePath.endsWith('.js')) {
      return false;
    }
    
    // Check if file is not a test file
    if (this.testFilePatterns.some(pattern => filePath.includes(pattern))) {
      return false;
    }
    
    // Check if file is not in excluded directories
    if (this.excludePatterns.some(pattern => filePath.includes(pattern))) {
      return false;
    }
    
    // Check if file exists and is readable
    try {
      fs.accessSync(filePath, fs.constants.R_OK);
      return true;
    } catch (error) {
      return false;
    }
  }

  isTestFile(filePath) {
    return this.testFilePatterns.some(pattern => filePath.includes(pattern)) && 
           filePath.endsWith('.js');
  }

  shouldSkipFile(filePath) {
    // Skip files that are not valid source files
    if (!this.isValidSourceFile(filePath)) {
      return true;
    }
    
    // Skip empty files
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      if (!content.trim()) {
        logger.info(`⏭️ Skipping empty file: ${filePath}`);
        return true;
      }
    } catch (error) {
      logger.warn(`⚠️ Cannot read file ${filePath}:`, error.message);
      return true;
    }
    
    return false;
  }

  cleanupEmptyDirectories(dirPath) {
    try {
      if (!fs.existsSync(dirPath)) {
        return;
      }
      
      const entries = fs.readdirSync(dirPath);
      
      if (entries.length === 0) {
        fs.rmdirSync(dirPath);
        logger.info(`🗂️ Removed empty directory: ${dirPath}`);
        
        // Recursively clean up parent directories if they're empty
        const parentDir = path.dirname(dirPath);
        if (parentDir !== dirPath && parentDir !== this.testDirectory) {
          this.cleanupEmptyDirectories(parentDir);
        }
      }
      
    } catch (error) {
      logger.warn(`⚠️ Failed to cleanup directory ${dirPath}:`, error.message);
    }
  }

  getFileStats(filePath) {
    try {
      const stats = fs.statSync(filePath);
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      return {
        size: stats.size,
        lines: lines.length,
        nonEmptyLines: lines.filter(line => line.trim().length > 0).length,
        lastModified: stats.mtime,
        created: stats.birthtime
      };
      
    } catch (error) {
      logger.error(`❌ Failed to get file stats for ${filePath}:`, error.message);
      return null;
    }
  }

  async organizeTestFiles() {
    logger.info("🗂️ Organizing test files...");
    
    const testFiles = this.getExistingTestFiles();
    let organized = 0;
    
    for (const testFile of testFiles) {
      try {
        const sourceFile = this.getSourceFileFromTest(testFile);
        const expectedTestPath = this.getTestFilePath(sourceFile);
        
        if (testFile !== expectedTestPath) {
          // Move test file to expected location
          const expectedDir = path.dirname(expectedTestPath);
          if (!fs.existsSync(expectedDir)) {
            fs.mkdirSync(expectedDir, { recursive: true });
          }
          
          fs.renameSync(testFile, expectedTestPath);
          logger.info(`📁 Moved test file: ${testFile} → ${expectedTestPath}`);
          organized++;
          
          // Clean up old directory if empty
          this.cleanupEmptyDirectories(path.dirname(testFile));
        }
        
      } catch (error) {
        logger.warn(`⚠️ Failed to organize test file ${testFile}:`, error.message);
      }
    }
    
    logger.info(`🗂️ Organized ${organized} test files`);
    return organized;
  }

  getSourceFileFromTest(testFilePath) {
    // Convert test file path back to source file path
    let relativePath = path.relative(this.testDirectory, testFilePath);
    
    // Remove .test from filename
    const fileName = path.basename(relativePath);
    const sourceFileName = fileName.replace('.test.js', '.js');
    const sourceDir = path.dirname(relativePath);
    
    return path.join(sourceDir, sourceFileName);
  }

  validateTestFile(testFilePath) {
    try {
      if (!fs.existsSync(testFilePath)) {
        return { valid: false, error: "File does not exist" };
      }
      
      const content = fs.readFileSync(testFilePath, 'utf8');
      
      // Basic validation checks
      const checks = {
        hasDescribe: content.includes('describe('),
        hasTest: content.includes('test(') || content.includes('it('),
        hasRequire: content.includes('require('),
        hasExpect: content.includes('expect('),
        notEmpty: content.trim().length > 0
      };
      
      const failedChecks = Object.keys(checks).filter(check => !checks[check]);
      
      return {
        valid: failedChecks.length === 0,
        checks: checks,
        failedChecks: failedChecks,
        error: failedChecks.length > 0 ? `Failed checks: ${failedChecks.join(', ')}` : null
      };
      
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  getTestFileMapping() {
    const mapping = {};
    const sourceFiles = this.getAllSourceFiles();
    
    sourceFiles.forEach(sourceFile => {
      const testFile = this.getTestFilePath(sourceFile);
      mapping[sourceFile] = {
        testFile: testFile,
        exists: fs.existsSync(testFile),
        stats: this.getFileStats(sourceFile)
      };
    });
    
    return mapping;
  }
}

module.exports = FileManager;
