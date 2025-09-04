const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const winston = require("winston");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();

const GitAnalyzer = require("./agents/git-analyzer");
const TestGenerationAgent = require("./agents/test-generation-agent");
const CoverageAgent = require("./agents/coverage-agent");
const FileManager = require("./utils/file-manager");
const CoverageReporter = require("./utils/coverage-reporter");

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
    winston.format.prettyPrint()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/ai-test-generator.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

class AITestOrchestrator {
  constructor() {
    this.sessionId = uuidv4();
    this.gitAnalyzer = new GitAnalyzer();
    this.testAgent = new TestGenerationAgent();
    this.coverageAgent = new CoverageAgent();
    this.fileManager = new FileManager();
    this.coverageReporter = new CoverageReporter();
    
    // Ensure logs directory exists
    if (!fs.existsSync('logs')) {
      fs.mkdirSync('logs', { recursive: true });
    }
    
    logger.info(`🚀 AI Test Orchestrator initialized - Session: ${this.sessionId}`);
  }

  async execute() {
    try {
      logger.info("🔍 Starting AI Test Generation Workflow");
      
      // Step 1: Analyze Git repository state
      const repoAnalysis = await this.analyzeRepository();
      
      // Step 2: Generate test execution plan
      const executionPlan = await this.createExecutionPlan(repoAnalysis);
      
      // Step 3: Execute the plan using agents
      const results = await this.executePlan(executionPlan);

      // Step 3.5: Run generated tests to validate they execute before running coverage
      try {
        const testRunResults = await this.runGeneratedTests();
        results.testRun = testRunResults;
        // If tests failed, record an error but continue to coverage analysis so we can collect coverage data
        if (!testRunResults.passed) {
          results.errors.push({ action: 'RUN_GENERATED_TESTS', error: 'Generated tests failed', details: testRunResults });
        }
      } catch (err) {
        logger.error('\u274c Running generated tests failed:', err.message || err);
        results.errors.push({ action: 'RUN_GENERATED_TESTS', error: err.message || String(err) });
      }

      // Step 4: Validate coverage and improve if needed
      const finalResults = await this.validateAndImprove(results);
      
      // Step 5: Generate reports
      await this.generateReports(finalResults);
      
      logger.info("✅ AI Test Generation Workflow completed successfully");
      return finalResults;
      
    } catch (error) {
      logger.error("❌ Workflow execution failed:", error);
      throw error;
    }
  }

  async runGeneratedTests() {
    logger.info('\u26a0\ufe0f Running generated tests (jest on tests/)...');

    try {
      // Run Jest only on the tests directory in-band to get deterministic results
      const cmd = 'npx jest tests --runInBand --colors=false --reporters=default';
      const output = execSync(cmd, { stdio: 'pipe', encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });

      // Basic success result
      return {
        passed: true,
        output: output.trim(),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      // execSync throws when jest exits non-zero. Capture stdout/stderr if present
      const result = {
        passed: false,
        errorMessage: error.message,
        stdout: (error.stdout || '').toString().trim(),
        stderr: (error.stderr || '').toString().trim(),
        timestamp: new Date().toISOString()
      };

      // Return failure details for reporting
      return result;
    }
  }

  async analyzeRepository() {
    logger.info("📊 Analyzing repository state...");
    
    const analysis = {
      isFirstTime: false,
      changedFiles: [],
      deletedFiles: [],
      newFiles: [],
      modifiedFiles: [],
      rewrittenFiles: [],
      testFiles: []
    };

    try {
      // Check if this is first time (only one commit)
      const commitCount = execSync("git rev-list --count HEAD").toString().trim();
      analysis.isFirstTime = parseInt(commitCount) <= 1;
      
      if (analysis.isFirstTime) {
        logger.info("🌟 First time analysis - generating tests for all files");
        analysis.allFiles = this.gitAnalyzer.getAllJSFiles();
      } else {
        logger.info("🔄 Incremental analysis - detecting changes");
        const changes = await this.gitAnalyzer.analyzeChanges();
        Object.assign(analysis, changes);
      }
      
      // Get existing test files
      analysis.testFiles = this.fileManager.getExistingTestFiles();
      
      logger.info(`📈 Analysis complete: ${JSON.stringify({
        isFirstTime: analysis.isFirstTime,
        changedCount: analysis.changedFiles.length,
        newCount: analysis.newFiles.length,
        deletedCount: analysis.deletedFiles.length,
        rewrittenCount: analysis.rewrittenFiles.length
      })}`);
      
      return analysis;
      
    } catch (error) {
      logger.error("❌ Repository analysis failed:", error);
      throw error;
    }
  }

  async createExecutionPlan(analysis) {
    logger.info("📋 Creating execution plan...");
    
    const plan = {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      actions: []
    };

    if (analysis.isFirstTime) {
      // Generate tests for all files
      plan.actions.push({
        type: 'GENERATE_ALL',
        files: analysis.allFiles,
        priority: 1
      });
    } else {
      // Handle different change types
      
      // 1. Delete tests for deleted files
      if (analysis.deletedFiles.length > 0) {
        plan.actions.push({
          type: 'DELETE_TESTS',
          files: analysis.deletedFiles,
          priority: 1
        });
      }
      
      // 2. Generate tests for new files
      if (analysis.newFiles.length > 0) {
        plan.actions.push({
          type: 'GENERATE_NEW',
          files: analysis.newFiles,
          priority: 2
        });
      }
      
      // 3. Update tests for modified files
      if (analysis.modifiedFiles.length > 0) {
        plan.actions.push({
          type: 'UPDATE_TESTS',
          files: analysis.modifiedFiles,
          priority: 3
        });
      }
      
      // 4. Regenerate tests for rewritten files
      if (analysis.rewrittenFiles.length > 0) {
        plan.actions.push({
          type: 'REGENERATE_TESTS',
          files: analysis.rewrittenFiles,
          priority: 4
        });
      }
    }

    // Sort actions by priority
    plan.actions.sort((a, b) => a.priority - b.priority);
    
    logger.info(`📋 Execution plan created with ${plan.actions.length} actions`);
    return plan;
  }

  async executePlan(plan) {
    logger.info("⚡ Executing test generation plan...");
    
    const results = {
      sessionId: plan.sessionId,
      totalFiles: 0,
      processedFiles: 0,
      generatedTests: 0,
      updatedTests: 0,
      deletedTests: 0,
      errors: [],
      coverage: null
    };

    for (const action of plan.actions) {
      try {
        logger.info(`🔨 Executing action: ${action.type} for ${action.files.length} files`);
        
        switch (action.type) {
          case 'GENERATE_ALL':
            await this.executeGenerateAll(action.files, results);
            break;
          case 'GENERATE_NEW':
            await this.executeGenerateNew(action.files, results);
            break;
          case 'UPDATE_TESTS':
            await this.executeUpdateTests(action.files, results);
            break;
          case 'REGENERATE_TESTS':
            await this.executeRegenerateTests(action.files, results);
            break;
          case 'DELETE_TESTS':
            await this.executeDeleteTests(action.files, results);
            break;
        }
        
      } catch (error) {
        logger.error(`❌ Action ${action.type} failed:`, error);
        results.errors.push({
          action: action.type,
          error: error.message,
          files: action.files
        });
      }
    }
    
    logger.info(`⚡ Plan execution complete: ${results.generatedTests} generated, ${results.updatedTests} updated`);
    return results;
  }

  async executeGenerateAll(files, results) {
    for (const file of files) {
      if (this.fileManager.shouldSkipFile(file)) continue;
      
      const testContent = await this.testAgent.generateTests(file);
      if (testContent) {
        await this.fileManager.writeTestFile(file, testContent);
        results.generatedTests++;
      }
      results.processedFiles++;
    }
    results.totalFiles += files.length;
  }

  async executeGenerateNew(files, results) {
    for (const file of files) {
      if (this.fileManager.shouldSkipFile(file)) continue;
      
      const testContent = await this.testAgent.generateTests(file);
      if (testContent) {
        await this.fileManager.writeTestFile(file, testContent);
        results.generatedTests++;
      }
      results.processedFiles++;
    }
    results.totalFiles += files.length;
  }

  async executeUpdateTests(files, results) {
    for (const fileData of files) {
      if (this.fileManager.shouldSkipFile(fileData.file)) continue;
      
      const updatedContent = await this.testAgent.updateTests(fileData);
      if (updatedContent) {
        await this.fileManager.updateTestFile(fileData.file, updatedContent);
        results.updatedTests++;
      }
      results.processedFiles++;
    }
    results.totalFiles += files.length;
  }

  async executeRegenerateTests(files, results) {
    for (const file of files) {
      if (this.fileManager.shouldSkipFile(file)) continue;
      
      // Delete existing test
      await this.fileManager.deleteTestFile(file);
      
      // Generate new test
      const testContent = await this.testAgent.generateTests(file);
      if (testContent) {
        await this.fileManager.writeTestFile(file, testContent);
        results.generatedTests++;
      }
      results.processedFiles++;
    }
    results.totalFiles += files.length;
  }

  async executeDeleteTests(files, results) {
    for (const file of files) {
      await this.fileManager.deleteTestFile(file);
      results.deletedTests++;
    }
    results.totalFiles += files.length;
  }

  async validateAndImprove(results) {
    logger.info("🎯 Validating coverage and improving tests...");
    
    // Run initial coverage analysis
    const coverageResults = await this.coverageAgent.runCoverageAnalysis();
    results.coverage = coverageResults;
    
    // Check if coverage meets threshold (80%)
    const overallCoverage = this.coverageAgent.calculateOverallCoverage(coverageResults);
    
    if (overallCoverage >= 80) {
      logger.info(`✅ Coverage target achieved: ${overallCoverage.toFixed(2)}%`);
      return results;
    }
    
    logger.info(`🔄 Coverage below threshold (${overallCoverage.toFixed(2)}%), starting mutation process...`);
    
    // Identify files needing improvement
    const improvementTargets = this.coverageAgent.identifyImprovementTargets(coverageResults);
    
    // Use mutation agent to improve coverage
    const mutationResults = await this.coverageAgent.improveCoverage(improvementTargets);
    
    // Update results
    results.mutationRounds = mutationResults.rounds;
    results.finalCoverage = mutationResults.finalCoverage;
    results.coverageImproved = true;
    
    logger.info(`🎯 Final coverage achieved: ${mutationResults.finalCoverage.toFixed(2)}%`);
    
    return results;
  }

  async generateReports(results) {
    logger.info("📊 Generating comprehensive reports...");
    
    // Generate coverage reports
    await this.coverageReporter.generateHTMLReport();
    await this.coverageReporter.generateJSONReport();
    
    // Store execution report
    const reportPath = path.join('reports', `execution-${this.sessionId}.json`);
    if (!fs.existsSync('reports')) {
      fs.mkdirSync('reports', { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    
    // Generate summary report
    const summaryReport = {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      summary: {
        totalFiles: results.totalFiles,
        processedFiles: results.processedFiles,
        generatedTests: results.generatedTests,
        updatedTests: results.updatedTests,
        deletedTests: results.deletedTests,
        errorCount: results.errors.length,
        finalCoverage: results.finalCoverage || results.coverage?.overall || 0,
        coverageTarget: 80,
        targetAchieved: (results.finalCoverage || results.coverage?.overall || 0) >= 80
      },
      errors: results.errors
    };
    
    const summaryPath = path.join('reports', `summary-${new Date().toISOString().split('T')[0]}.json`);
    fs.writeFileSync(summaryPath, JSON.stringify(summaryReport, null, 2));
    
    logger.info("📊 Reports generated successfully");
    logger.info(`📁 Execution Report: ${reportPath}`);
    logger.info(`📁 Summary Report: ${summaryPath}`);
    logger.info(`📁 Coverage Report: coverage/lcov-report/index.html`);
  }
}

module.exports = AITestOrchestrator;
