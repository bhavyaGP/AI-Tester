const AITestOrchestrator = require('./ai-test-orchestrator');
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Configure main logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'ai-test-generator' },
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, stack }) => {
          return `${timestamp} [${level}] ${stack || message}`;
        })
      )
    }),
    // Write all logs to file
    new winston.transports.File({ 
      filename: 'logs/ai-test-generator.log',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
    // Write errors to separate file
    new winston.transports.File({ 
      filename: 'logs/errors.log', 
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ]
});

class AITestGeneratorMain {
  constructor() {
    this.orchestrator = null;
    this.startTime = null;
    this.ensureDirectories();
  }

  ensureDirectories() {
    const dirs = ['logs', 'reports', 'test-backups'];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        logger.info(`📁 Created directory: ${dir}`);
      }
    });
  }

  async run() {
    try {
      this.startTime = Date.now();
      
      logger.info('🚀 Starting AI Test Generator');
      logger.info('=' .repeat(80));
      
      // Validate environment
      await this.validateEnvironment();
      
      // Initialize orchestrator
      this.orchestrator = new AITestOrchestrator();
      
      // Execute the workflow
      const results = await this.orchestrator.execute();
      
      // Log final results
      await this.logFinalResults(results);
      
      logger.info('✅ AI Test Generator completed successfully');
      
      return results;
      
    } catch (error) {
      logger.error('❌ AI Test Generator failed:', error);
      await this.handleFailure(error);
      throw error;
    }
  }

  async validateEnvironment() {
    logger.info('🔍 Validating environment...');
    
    const validations = [];
    
    // Check for required environment variables
      if (!process.env.GEMINI_API) {
        validations.push('⚠️ GEMINI_API not set - running in mock mode');
    } else {
      validations.push('✅ GEMINI_API configured');
    }
    
    // Check for Git repository
    try {
      const { execSync } = require('child_process');
      execSync('git rev-parse --git-dir', { stdio: 'pipe' });
      validations.push('✅ Git repository detected');
    } catch (error) {
      validations.push('❌ Not a Git repository');
      throw new Error('This tool requires a Git repository to track changes');
    }
    
    // Check for package.json
    if (fs.existsSync('package.json')) {
      validations.push('✅ package.json found');
      
      // Check for required scripts
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const requiredScripts = ['test', 'test:coverage'];
      const missingScripts = requiredScripts.filter(script => !packageJson.scripts || !packageJson.scripts[script]);
      
      if (missingScripts.length === 0) {
        validations.push('✅ Required npm scripts configured');
      } else {
        validations.push(`❌ Missing npm scripts: ${missingScripts.join(', ')}`);
      }
    } else {
      validations.push('❌ package.json not found');
    }
    
    // Check for Jest configuration
    const jestConfigFiles = ['jest.config.js', 'jest.config.json', 'package.json'];
    const hasJestConfig = jestConfigFiles.some(file => {
      if (file === 'package.json') {
        try {
          const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
          return pkg.jest !== undefined;
        } catch {
          return false;
        }
      }
      return fs.existsSync(file);
    });
    
    if (hasJestConfig) {
      validations.push('✅ Jest configuration found');
    } else {
      validations.push('❌ Jest configuration not found');
    }
    
    // Log validation results
    validations.forEach(validation => {
      logger.info(validation);
    });
    
    const failed = validations.filter(v => v.startsWith('❌'));
    if (failed.length > 0) {
      throw new Error(`Environment validation failed: ${failed.length} issues found`);
    }
    
    logger.info('✅ Environment validation passed');
  }

  async logFinalResults(results) {
    const endTime = Date.now();
    const duration = ((endTime - this.startTime) / 1000).toFixed(2);
    
    logger.info('📊 FINAL RESULTS');
    logger.info('=' .repeat(50));
    logger.info(`Session ID: ${results.sessionId}`);
    logger.info(`Duration: ${duration}s`);
    logger.info(`Total Files: ${results.totalFiles}`);
    logger.info(`Processed Files: ${results.processedFiles}`);
    logger.info(`Generated Tests: ${results.generatedTests}`);
    logger.info(`Updated Tests: ${results.updatedTests}`);
    logger.info(`Deleted Tests: ${results.deletedTests}`);
    logger.info(`Errors: ${results.errors.length}`);
    
    if (results.finalCoverage !== undefined) {
      logger.info(`Final Coverage: ${results.finalCoverage.toFixed(2)}%`);
      logger.info(`Coverage Target: 80%`);
      logger.info(`Target Achieved: ${results.finalCoverage >= 80 ? '✅ Yes' : '❌ No'}`);
      
      if (results.mutationRounds) {
        logger.info(`Mutation Rounds: ${results.mutationRounds}`);
      }
    }
    
    if (results.errors.length > 0) {
      logger.warn('⚠️ ERRORS ENCOUNTERED:');
      results.errors.forEach((error, index) => {
        logger.warn(`${index + 1}. ${error.action}: ${error.error}`);
      });
    }
    
    logger.info('=' .repeat(50));
  }

  async handleFailure(error) {
    try {
      // Save failure report
      const failureReport = {
        timestamp: new Date().toISOString(),
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        },
        duration: this.startTime ? ((Date.now() - this.startTime) / 1000).toFixed(2) : 'unknown',
        environment: {
          nodeVersion: process.version,
          platform: process.platform,
          cwd: process.cwd()
        }
      };
      
      const failureReportPath = path.join('reports', `failure-${Date.now()}.json`);
      fs.writeFileSync(failureReportPath, JSON.stringify(failureReport, null, 2));
      
      logger.info(`💾 Failure report saved: ${failureReportPath}`);
      
    } catch (reportError) {
      logger.error('Failed to save failure report:', reportError);
    }
  }
}

// Production-ready configurations
const ProductionConfig = {
  // CI/CD Integration
  ci: {
    enabled: process.env.CI === 'true',
    failOnCoverageThreshold: process.env.FAIL_ON_COVERAGE !== 'false',
    generateArtifacts: process.env.GENERATE_ARTIFACTS !== 'false',
    slackWebhook: process.env.SLACK_WEBHOOK_URL,
    emailNotifications: process.env.EMAIL_NOTIFICATIONS === 'true'
  },
  
  // Performance Settings
  performance: {
    maxConcurrentFiles: parseInt(process.env.MAX_CONCURRENT_FILES) || 3,
    retryAttempts: parseInt(process.env.RETRY_ATTEMPTS) || 3,
    requestDelay: parseInt(process.env.REQUEST_DELAY) || 1000,
    timeoutMs: parseInt(process.env.TIMEOUT_MS) || 30000
  },
  
  // Coverage Settings
  coverage: {
    threshold: {
      statements: parseInt(process.env.COVERAGE_STATEMENTS) || 80,
      branches: parseInt(process.env.COVERAGE_BRANCHES) || 75,
      functions: parseInt(process.env.COVERAGE_FUNCTIONS) || 85,
      lines: parseInt(process.env.COVERAGE_LINES) || 80
    },
    reportFormats: (process.env.COVERAGE_FORMATS || 'html,json,lcov').split(','),
    storeHistory: process.env.STORE_COVERAGE_HISTORY !== 'false'
  },
  
  // Security Settings
  security: {
    apiKeyRotation: process.env.API_KEY_ROTATION === 'true',
    encryptReports: process.env.ENCRYPT_REPORTS === 'true',
    sanitizeLogs: process.env.SANITIZE_LOGS !== 'false'
  }
};

// CLI Support
async function runFromCLI() {
  const args = process.argv.slice(2);
  const options = {};
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--force':
        options.force = true;
        break;
      case '--coverage-only':
        options.coverageOnly = true;
        break;
      case '--verbose':
        logger.level = 'debug';
        break;
      case '--quiet':
        logger.level = 'warn';
        break;
      case '--help':
        printHelp();
        process.exit(0);
        break;
    }
  }
  
  try {
    const generator = new AITestGeneratorMain();
    const results = await generator.run();
    
    // Exit with appropriate code
    const success = results.errors.length === 0 && 
                   (results.finalCoverage === undefined || results.finalCoverage >= 80);
    
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    logger.error('CLI execution failed:', error);
    process.exit(1);
  }
}

function printHelp() {
  console.log(`
AI Test Generator - Automated Unit Test Generation with Coverage Analysis

USAGE:
  node sripts/ai-test-generator-main.js [OPTIONS]

OPTIONS:
  --dry-run         Show what would be done without making changes
  --force           Force regeneration of all tests
  --coverage-only   Only run coverage analysis without generating tests
  --verbose         Enable verbose logging
  --quiet           Reduce logging output
  --help            Show this help message

ENVIRONMENT VARIABLES:
  GEMINI_API                 Google Gemini API key (required)
  LOG_LEVEL                  Logging level (debug, info, warn, error)
  MAX_CONCURRENT_FILES       Maximum files to process concurrently (default: 3)
  COVERAGE_STATEMENTS        Statement coverage threshold (default: 80)
  COVERAGE_BRANCHES          Branch coverage threshold (default: 75)
  COVERAGE_FUNCTIONS         Function coverage threshold (default: 85)
  FAIL_ON_COVERAGE          Fail if coverage thresholds not met (default: true)

EXAMPLES:
  # Run full test generation and coverage analysis
  node sripts/ai-test-generator-main.js

  # Run with verbose logging
  node sripts/ai-test-generator-main.js --verbose

  # Only analyze coverage without generating new tests
  node sripts/ai-test-generator-main.js --coverage-only

REPORTS:
  HTML Coverage: coverage/lcov-report/index.html
  JSON Reports:  reports/
  Logs:          logs/
  `);
}

// Export for use as module or run directly
if (require.main === module) {
  runFromCLI();
} else {
  module.exports = {
    AITestGeneratorMain,
    ProductionConfig,
    runFromCLI
  };
}
