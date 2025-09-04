const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const winston = require("winston");
const TestGenerationAgent = require("./test-generation-agent");

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

class CoverageAgent {
  constructor() {
    this.testAgent = new TestGenerationAgent();
    this.coverageThreshold = {
      statements: 80,
      branches: 75,
      functions: 85,
      lines: 80
    };
    this.maxMutationRounds = 3;
    this.coveragePath = path.join(process.cwd(), 'coverage', 'coverage-final.json');
  }

  async runCoverageAnalysis() {
    try {
      logger.info("📊 Running coverage analysis...");
      
      // Run tests with coverage
      execSync("npm run test:coverage", { stdio: "pipe" });
      
      // Parse coverage results
      const coverageData = await this.parseCoverageResults();
      
      if (!coverageData) {
        throw new Error("Failed to parse coverage results");
      }
      
      logger.info("✅ Coverage analysis completed");
      return coverageData;
      
    } catch (error) {
      logger.error("❌ Coverage analysis failed:", error.message);
      
      // Try to parse any existing coverage data
      const existingCoverage = await this.parseCoverageResults();
      if (existingCoverage) {
        logger.info("📊 Using existing coverage data");
        return existingCoverage;
      }
      
      throw error;
    }
  }

  async parseCoverageResults() {
    try {
      if (!fs.existsSync(this.coveragePath)) {
        logger.warn("⚠️ Coverage file not found:", this.coveragePath);
        return null;
      }

      const rawData = fs.readFileSync(this.coveragePath, 'utf8');
      const coverageData = JSON.parse(rawData);
      
      const results = {
        files: {},
        summary: {
          statements: { total: 0, covered: 0, percent: 0 },
          branches: { total: 0, covered: 0, percent: 0 },
          functions: { total: 0, covered: 0, percent: 0 },
          lines: { total: 0, covered: 0, percent: 0 }
        }
      };
      
      // Process each file
      Object.keys(coverageData).forEach(filePath => {
        const fileCoverage = coverageData[filePath];
        
        // Calculate file-level coverage
        const fileResults = this.calculateFileCoverage(fileCoverage);
        results.files[filePath] = fileResults;
        
        // Add to summary
        results.summary.statements.total += fileResults.statements.total;
        results.summary.statements.covered += fileResults.statements.covered;
        results.summary.branches.total += fileResults.branches.total;
        results.summary.branches.covered += fileResults.branches.covered;
        results.summary.functions.total += fileResults.functions.total;
        results.summary.functions.covered += fileResults.functions.covered;
        results.summary.lines.total += fileResults.lines.total;
        results.summary.lines.covered += fileResults.lines.covered;
      });
      
      // Calculate summary percentages
      results.summary.statements.percent = this.calculatePercentage(
        results.summary.statements.covered,
        results.summary.statements.total
      );
      results.summary.branches.percent = this.calculatePercentage(
        results.summary.branches.covered,
        results.summary.branches.total
      );
      results.summary.functions.percent = this.calculatePercentage(
        results.summary.functions.covered,
        results.summary.functions.total
      );
      results.summary.lines.percent = this.calculatePercentage(
        results.summary.lines.covered,
        results.summary.lines.total
      );
      
      // Calculate overall coverage
      results.overall = (
        results.summary.statements.percent +
        results.summary.branches.percent +
        results.summary.functions.percent +
        results.summary.lines.percent
      ) / 4;
      
      return results;
      
    } catch (error) {
      logger.error("❌ Failed to parse coverage results:", error.message);
      return null;
    }
  }

  calculateFileCoverage(fileCoverage) {
    const result = {
      statements: { total: 0, covered: 0, percent: 0, uncovered: [] },
      branches: { total: 0, covered: 0, percent: 0, uncovered: [] },
      functions: { total: 0, covered: 0, percent: 0, uncovered: [] },
      lines: { total: 0, covered: 0, percent: 0, uncovered: [] },
      statementMap: fileCoverage.statementMap || {},
      fnMap: fileCoverage.fnMap || {},
      branchMap: fileCoverage.branchMap || {}
    };
    
    // Statements
    if (fileCoverage.s) {
      Object.keys(fileCoverage.s).forEach(key => {
        result.statements.total++;
        if (fileCoverage.s[key] > 0) {
          result.statements.covered++;
        } else {
          result.statements.uncovered.push(key);
        }
      });
      result.statements.percent = this.calculatePercentage(
        result.statements.covered,
        result.statements.total
      );
    }
    
    // Functions
    if (fileCoverage.f) {
      Object.keys(fileCoverage.f).forEach(key => {
        result.functions.total++;
        if (fileCoverage.f[key] > 0) {
          result.functions.covered++;
        } else {
          result.functions.uncovered.push(key);
        }
      });
      result.functions.percent = this.calculatePercentage(
        result.functions.covered,
        result.functions.total
      );
    }
    
    // Branches
    if (fileCoverage.b) {
      Object.keys(fileCoverage.b).forEach(key => {
        const branches = fileCoverage.b[key];
        branches.forEach((count, index) => {
          result.branches.total++;
          if (count > 0) {
            result.branches.covered++;
          } else {
            result.branches.uncovered.push(`${key}.${index}`);
          }
        });
      });
      result.branches.percent = this.calculatePercentage(
        result.branches.covered,
        result.branches.total
      );
    }
    
    return result;
  }

  calculateOverallCoverage(coverageResults) {
    if (!coverageResults || !coverageResults.summary) {
      return 0;
    }
    
    return coverageResults.overall || 0;
  }

  identifyImprovementTargets(coverageResults) {
    const targets = [];
    
    if (!coverageResults || !coverageResults.files) {
      return targets;
    }
    
    Object.keys(coverageResults.files).forEach(filePath => {
      const fileData = coverageResults.files[filePath];
      
      // Check if file needs improvement
      const needsImprovement = 
        fileData.statements.percent < this.coverageThreshold.statements ||
        fileData.branches.percent < this.coverageThreshold.branches ||
        fileData.functions.percent < this.coverageThreshold.functions;
      
      if (needsImprovement) {
        targets.push({
          filePath: filePath,
          currentCoverage: {
            statements: fileData.statements.percent,
            branches: fileData.branches.percent,
            functions: fileData.functions.percent
          },
          uncoveredStatements: fileData.statements.uncovered,
          uncoveredFunctions: fileData.functions.uncovered,
          uncoveredBranches: fileData.branches.uncovered,
          priority: this.calculateImprovementPriority(fileData)
        });
      }
    });
    
    // Sort by priority (highest first)
    targets.sort((a, b) => b.priority - a.priority);
    
    logger.info(`🎯 Identified ${targets.length} files needing coverage improvement`);
    return targets;
  }

  calculateImprovementPriority(fileData) {
    // Calculate priority based on coverage gaps
    const statementGap = Math.max(0, this.coverageThreshold.statements - fileData.statements.percent);
    const branchGap = Math.max(0, this.coverageThreshold.branches - fileData.branches.percent);
    const functionGap = Math.max(0, this.coverageThreshold.functions - fileData.functions.percent);
    
    return statementGap + branchGap + functionGap;
  }

  async improveCoverage(targets) {
    logger.info(`🔄 Starting coverage improvement for ${targets.length} files`);
    
    let currentRound = 1;
    let improvedFiles = 0;
    let finalCoverage = 0;
    
    while (currentRound <= this.maxMutationRounds && targets.length > 0) {
      logger.info(`🧬 Mutation round ${currentRound}/${this.maxMutationRounds}`);
      
      const roundResults = await this.executeMutationRound(targets);
      improvedFiles += roundResults.improvedCount;
      
      // Re-run coverage analysis
      const newCoverage = await this.runCoverageAnalysis();
      finalCoverage = this.calculateOverallCoverage(newCoverage);
      
      logger.info(`📊 Round ${currentRound} coverage: ${finalCoverage.toFixed(2)}%`);
      
      // Check if we've reached the target
      if (finalCoverage >= this.coverageThreshold.statements) {
        logger.info(`✅ Coverage target achieved: ${finalCoverage.toFixed(2)}%`);
        break;
      }
      
      // Update targets for next round
      targets = this.identifyImprovementTargets(newCoverage);
      currentRound++;
      
      // Add delay between rounds to avoid rate limits
      await this.delay(2000);
    }
    
    return {
      rounds: currentRound - 1,
      improvedFiles: improvedFiles,
      finalCoverage: finalCoverage
    };
  }

  async executeMutationRound(targets) {
    let improvedCount = 0;
    const batchSize = 3; // Process in smaller batches to avoid rate limits
    
    for (let i = 0; i < targets.length; i += batchSize) {
      const batch = targets.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (target) => {
        try {
          const coverageData = {
            summary: target.currentCoverage,
            statementMap: target.uncoveredStatements,
            fnMap: target.uncoveredFunctions,
            branchMap: target.uncoveredBranches
          };
          
          const improvedTests = await this.testAgent.generateTestsWithMutation(
            target.filePath,
            coverageData
          );
          
          if (improvedTests) {
            const FileManager = require("../utils/file-manager");
            const fileManager = new FileManager();
            await fileManager.writeTestFile(target.filePath, improvedTests);
            improvedCount++;
            logger.info(`✅ Improved tests for: ${target.filePath}`);
          }
          
        } catch (error) {
          logger.error(`❌ Failed to improve tests for ${target.filePath}:`, error.message);
        }
      });
      
      await Promise.all(batchPromises);
      
      // Add delay between batches
      if (i + batchSize < targets.length) {
        await this.delay(1000);
      }
    }
    
    return { improvedCount };
  }

  async generateDetailedReport(coverageResults) {
    const report = {
      timestamp: new Date().toISOString(),
      overall: {
        coverage: coverageResults.overall,
        passed: coverageResults.overall >= this.coverageThreshold.statements,
        threshold: this.coverageThreshold.statements
      },
      summary: coverageResults.summary,
      fileDetails: []
    };
    
    Object.keys(coverageResults.files).forEach(filePath => {
      const fileData = coverageResults.files[filePath];
      const relativePath = path.relative(process.cwd(), filePath);
      
      report.fileDetails.push({
        file: relativePath,
        coverage: {
          statements: fileData.statements.percent,
          branches: fileData.branches.percent,
          functions: fileData.functions.percent,
          lines: fileData.lines.percent
        },
        status: this.getFileStatus(fileData),
        uncoveredLines: this.getUncoveredLineNumbers(fileData),
        recommendations: this.generateRecommendations(fileData)
      });
    });
    
    // Sort files by coverage (lowest first)
    report.fileDetails.sort((a, b) => {
      const avgA = (a.coverage.statements + a.coverage.branches + a.coverage.functions) / 3;
      const avgB = (b.coverage.statements + b.coverage.branches + b.coverage.functions) / 3;
      return avgA - avgB;
    });
    
    return report;
  }

  getFileStatus(fileData) {
    const avgCoverage = (fileData.statements.percent + fileData.branches.percent + fileData.functions.percent) / 3;
    
    if (avgCoverage >= 90) return 'excellent';
    if (avgCoverage >= 80) return 'good';
    if (avgCoverage >= 60) return 'needs_improvement';
    return 'poor';
  }

  getUncoveredLineNumbers(fileData) {
    const uncoveredLines = [];
    
    if (fileData.statementMap && fileData.statements.uncovered) {
      fileData.statements.uncovered.forEach(stmtId => {
        const stmt = fileData.statementMap[stmtId];
        if (stmt && stmt.start) {
          uncoveredLines.push(stmt.start.line);
        }
      });
    }
    
    return [...new Set(uncoveredLines)].sort((a, b) => a - b);
  }

  generateRecommendations(fileData) {
    const recommendations = [];
    
    if (fileData.functions.percent < this.coverageThreshold.functions) {
      recommendations.push("Add tests for uncovered functions");
    }
    
    if (fileData.branches.percent < this.coverageThreshold.branches) {
      recommendations.push("Add tests for conditional branches and error paths");
    }
    
    if (fileData.statements.percent < this.coverageThreshold.statements) {
      recommendations.push("Increase line coverage by testing edge cases");
    }
    
    return recommendations;
  }

  calculatePercentage(covered, total) {
    return total === 0 ? 100 : Math.round((covered / total) * 100 * 100) / 100;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getCoverageStatus(coverageResults) {
    const overall = this.calculateOverallCoverage(coverageResults);
    
    return {
      overall: overall,
      passed: overall >= this.coverageThreshold.statements,
      summary: {
        statements: coverageResults.summary.statements.percent >= this.coverageThreshold.statements,
        branches: coverageResults.summary.branches.percent >= this.coverageThreshold.branches,
        functions: coverageResults.summary.functions.percent >= this.coverageThreshold.functions,
        lines: coverageResults.summary.lines.percent >= this.coverageThreshold.lines
      },
      recommendations: this.generateOverallRecommendations(coverageResults)
    };
  }

  generateOverallRecommendations(coverageResults) {
    const recommendations = [];
    const summary = coverageResults.summary;
    
    if (summary.statements.percent < this.coverageThreshold.statements) {
      recommendations.push(`Improve statement coverage from ${summary.statements.percent}% to ${this.coverageThreshold.statements}%`);
    }
    
    if (summary.branches.percent < this.coverageThreshold.branches) {
      recommendations.push(`Improve branch coverage from ${summary.branches.percent}% to ${this.coverageThreshold.branches}%`);
    }
    
    if (summary.functions.percent < this.coverageThreshold.functions) {
      recommendations.push(`Improve function coverage from ${summary.functions.percent}% to ${this.coverageThreshold.functions}%`);
    }
    
    return recommendations;
  }
}

module.exports = CoverageAgent;
