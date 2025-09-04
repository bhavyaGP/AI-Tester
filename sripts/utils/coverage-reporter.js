const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
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

class CoverageReporter {
  constructor() {
    this.coverageDir = path.join(process.cwd(), 'coverage');
    this.reportsDir = path.join(process.cwd(), 'reports');
    this.storageDir = path.join(this.reportsDir, 'coverage-history');
    
    // Ensure directories exist
    [this.coverageDir, this.reportsDir, this.storageDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  async generateHTMLReport() {
    try {
      logger.info("📊 Generating HTML coverage report...");
      
      execSync("npm run test:coverage:html", { stdio: "pipe" });
      
      const htmlReportPath = path.join(this.coverageDir, 'lcov-report', 'index.html');
      
      if (fs.existsSync(htmlReportPath)) {
        logger.info(`✅ HTML coverage report generated: ${htmlReportPath}`);
        
        // Store a copy in reports directory
        const timestamp = new Date().toISOString().split('T')[0];
        const storedReportPath = path.join(this.reportsDir, `coverage-report-${timestamp}.html`);
        fs.copyFileSync(htmlReportPath, storedReportPath);
        
        return htmlReportPath;
      } else {
        throw new Error("HTML report not generated");
      }
      
    } catch (error) {
      logger.error("❌ Failed to generate HTML coverage report:", error.message);
      throw error;
    }
  }

  async generateJSONReport() {
    try {
      logger.info("📄 Generating JSON coverage report...");
      
      const jsonPath = path.join(this.coverageDir, 'coverage-final.json');
      
      if (!fs.existsSync(jsonPath)) {
        throw new Error("Coverage JSON file not found");
      }
      
      const rawData = fs.readFileSync(jsonPath, 'utf8');
      const coverageData = JSON.parse(rawData);
      
      // Process and enhance the coverage data
      const enhancedReport = await this.enhanceCoverageData(coverageData);
      
      // Store enhanced report
      const timestamp = new Date().toISOString();
      const reportPath = path.join(this.reportsDir, `coverage-detailed-${timestamp.split('T')[0]}.json`);
      
      fs.writeFileSync(reportPath, JSON.stringify(enhancedReport, null, 2));
      
      logger.info(`✅ JSON coverage report generated: ${reportPath}`);
      return reportPath;
      
    } catch (error) {
      logger.error("❌ Failed to generate JSON coverage report:", error.message);
      throw error;
    }
  }

  async enhanceCoverageData(rawCoverageData) {
    const enhanced = {
      timestamp: new Date().toISOString(),
      summary: {
        statements: { total: 0, covered: 0, percent: 0 },
        branches: { total: 0, covered: 0, percent: 0 },
        functions: { total: 0, covered: 0, percent: 0 },
        lines: { total: 0, covered: 0, percent: 0 }
      },
      files: {},
      analysis: {
        totalFiles: Object.keys(rawCoverageData).length,
        wellCoveredFiles: 0,
        poorlyCoveredFiles: 0,
        recommendations: []
      }
    };

    Object.keys(rawCoverageData).forEach(filePath => {
      const fileData = rawCoverageData[filePath];
      const relativePath = path.relative(process.cwd(), filePath);
      
      // Calculate file coverage
      const fileCoverage = this.calculateFileCoverage(fileData);
      enhanced.files[relativePath] = fileCoverage;
      
      // Add to summary totals
      enhanced.summary.statements.total += fileCoverage.statements.total;
      enhanced.summary.statements.covered += fileCoverage.statements.covered;
      enhanced.summary.branches.total += fileCoverage.branches.total;
      enhanced.summary.branches.covered += fileCoverage.branches.covered;
      enhanced.summary.functions.total += fileCoverage.functions.total;
      enhanced.summary.functions.covered += fileCoverage.functions.covered;
      enhanced.summary.lines.total += fileCoverage.lines.total;
      enhanced.summary.lines.covered += fileCoverage.lines.covered;
      
      // Analyze file coverage quality
      const avgCoverage = (fileCoverage.statements.percent + fileCoverage.functions.percent + fileCoverage.branches.percent) / 3;
      if (avgCoverage >= 80) {
        enhanced.analysis.wellCoveredFiles++;
      } else if (avgCoverage < 60) {
        enhanced.analysis.poorlyCoveredFiles++;
      }
    });

    // Calculate summary percentages
    enhanced.summary.statements.percent = this.calculatePercentage(
      enhanced.summary.statements.covered,
      enhanced.summary.statements.total
    );
    enhanced.summary.branches.percent = this.calculatePercentage(
      enhanced.summary.branches.covered,
      enhanced.summary.branches.total
    );
    enhanced.summary.functions.percent = this.calculatePercentage(
      enhanced.summary.functions.covered,
      enhanced.summary.functions.total
    );
    enhanced.summary.lines.percent = this.calculatePercentage(
      enhanced.summary.lines.covered,
      enhanced.summary.lines.total
    );

    // Calculate overall coverage
    enhanced.overall = (
      enhanced.summary.statements.percent +
      enhanced.summary.branches.percent +
      enhanced.summary.functions.percent +
      enhanced.summary.lines.percent
    ) / 4;

    // Generate recommendations
    enhanced.analysis.recommendations = this.generateRecommendations(enhanced);

    return enhanced;
  }

  calculateFileCoverage(fileData) {
    const coverage = {
      statements: { total: 0, covered: 0, percent: 0, uncovered: [] },
      branches: { total: 0, covered: 0, percent: 0, uncovered: [] },
      functions: { total: 0, covered: 0, percent: 0, uncovered: [] },
      lines: { total: 0, covered: 0, percent: 0, uncovered: [] },
      complexity: this.calculateComplexity(fileData)
    };

    // Statements
    if (fileData.s) {
      Object.keys(fileData.s).forEach(key => {
        coverage.statements.total++;
        if (fileData.s[key] > 0) {
          coverage.statements.covered++;
        } else {
          coverage.statements.uncovered.push(this.getStatementLocation(fileData.statementMap, key));
        }
      });
      coverage.statements.percent = this.calculatePercentage(
        coverage.statements.covered,
        coverage.statements.total
      );
    }

    // Functions
    if (fileData.f) {
      Object.keys(fileData.f).forEach(key => {
        coverage.functions.total++;
        if (fileData.f[key] > 0) {
          coverage.functions.covered++;
        } else {
          coverage.functions.uncovered.push(this.getFunctionLocation(fileData.fnMap, key));
        }
      });
      coverage.functions.percent = this.calculatePercentage(
        coverage.functions.covered,
        coverage.functions.total
      );
    }

    // Branches
    if (fileData.b) {
      Object.keys(fileData.b).forEach(key => {
        const branches = fileData.b[key];
        branches.forEach((count, index) => {
          coverage.branches.total++;
          if (count > 0) {
            coverage.branches.covered++;
          } else {
            coverage.branches.uncovered.push(this.getBranchLocation(fileData.branchMap, key, index));
          }
        });
      });
      coverage.branches.percent = this.calculatePercentage(
        coverage.branches.covered,
        coverage.branches.total
      );
    }

    return coverage;
  }

  getStatementLocation(statementMap, key) {
    if (statementMap && statementMap[key]) {
      const loc = statementMap[key];
      return {
        line: loc.start.line,
        column: loc.start.column,
        type: 'statement'
      };
    }
    return { line: 0, column: 0, type: 'statement' };
  }

  getFunctionLocation(fnMap, key) {
    if (fnMap && fnMap[key]) {
      const fn = fnMap[key];
      return {
        name: fn.name,
        line: fn.loc.start.line,
        column: fn.loc.start.column,
        type: 'function'
      };
    }
    return { name: 'unknown', line: 0, column: 0, type: 'function' };
  }

  getBranchLocation(branchMap, key, index) {
    if (branchMap && branchMap[key]) {
      const branch = branchMap[key];
      const location = branch.locations[index];
      return {
        line: location.start.line,
        column: location.start.column,
        type: branch.type,
        branchIndex: index
      };
    }
    return { line: 0, column: 0, type: 'unknown', branchIndex: index };
  }

  calculateComplexity(fileData) {
    // Simple complexity calculation based on branch count and function count
    const functionCount = fileData.fnMap ? Object.keys(fileData.fnMap).length : 0;
    const branchCount = fileData.branchMap ? Object.keys(fileData.branchMap).length : 0;
    
    const complexity = functionCount + (branchCount * 2);
    
    if (complexity > 20) return 'high';
    if (complexity > 10) return 'medium';
    return 'low';
  }

  generateRecommendations(enhancedData) {
    const recommendations = [];
    
    // Overall coverage recommendations
    if (enhancedData.overall < 80) {
      recommendations.push({
        type: 'coverage',
        priority: 'high',
        message: `Overall coverage is ${enhancedData.overall.toFixed(1)}%. Target: 80%+`,
        action: 'Generate additional tests for uncovered code paths'
      });
    }
    
    // Function coverage recommendations
    if (enhancedData.summary.functions.percent < 85) {
      recommendations.push({
        type: 'functions',
        priority: 'high',
        message: `Function coverage is ${enhancedData.summary.functions.percent.toFixed(1)}%. Target: 85%+`,
        action: 'Add tests for uncovered functions'
      });
    }
    
    // Branch coverage recommendations
    if (enhancedData.summary.branches.percent < 75) {
      recommendations.push({
        type: 'branches',
        priority: 'medium',
        message: `Branch coverage is ${enhancedData.summary.branches.percent.toFixed(1)}%. Target: 75%+`,
        action: 'Add tests for conditional logic and error paths'
      });
    }
    
    // File-specific recommendations
    const poorFiles = Object.keys(enhancedData.files).filter(file => {
      const fileData = enhancedData.files[file];
      const avgCoverage = (fileData.statements.percent + fileData.functions.percent + fileData.branches.percent) / 3;
      return avgCoverage < 60;
    });
    
    if (poorFiles.length > 0) {
      recommendations.push({
        type: 'files',
        priority: 'medium',
        message: `${poorFiles.length} files have poor coverage (<60%)`,
        action: 'Focus testing efforts on: ' + poorFiles.slice(0, 5).join(', '),
        files: poorFiles
      });
    }
    
    return recommendations;
  }

  async storeCoverageHistory(coverageData) {
    try {
      const timestamp = new Date().toISOString();
      const date = timestamp.split('T')[0];
      const historyFile = path.join(this.storageDir, `coverage-${date}.json`);
      
      const historyEntry = {
        timestamp: timestamp,
        overall: coverageData.overall,
        summary: coverageData.summary,
        fileCount: Object.keys(coverageData.files).length,
        analysis: coverageData.analysis
      };
      
      // Load existing history for the day if it exists
      let dailyHistory = [];
      if (fs.existsSync(historyFile)) {
        const existing = fs.readFileSync(historyFile, 'utf8');
        dailyHistory = JSON.parse(existing);
      }
      
      // Add new entry
      dailyHistory.push(historyEntry);
      
      // Keep only last 24 entries per day (hourly snapshots)
      if (dailyHistory.length > 24) {
        dailyHistory = dailyHistory.slice(-24);
      }
      
      fs.writeFileSync(historyFile, JSON.stringify(dailyHistory, null, 2));
      
      logger.info(`📚 Coverage history stored: ${historyFile}`);
      
    } catch (error) {
      logger.error("❌ Failed to store coverage history:", error.message);
    }
  }

  async generateTrendReport(days = 7) {
    try {
      logger.info(`📈 Generating coverage trend report for last ${days} days...`);
      
      const trendData = [];
      
      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const historyFile = path.join(this.storageDir, `coverage-${dateStr}.json`);
        
        if (fs.existsSync(historyFile)) {
          const dailyData = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
          
          // Get the latest entry for the day
          const latestEntry = dailyData[dailyData.length - 1];
          
          trendData.push({
            date: dateStr,
            overall: latestEntry.overall,
            summary: latestEntry.summary,
            entries: dailyData.length
          });
        }
      }
      
      // Sort by date (newest first)
      trendData.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      const trendReport = {
        generatedAt: new Date().toISOString(),
        period: `${days} days`,
        trends: trendData,
        analysis: this.analyzeTrends(trendData)
      };
      
      const reportPath = path.join(this.reportsDir, `coverage-trend-${days}days.json`);
      fs.writeFileSync(reportPath, JSON.stringify(trendReport, null, 2));
      
      logger.info(`📈 Trend report generated: ${reportPath}`);
      return reportPath;
      
    } catch (error) {
      logger.error("❌ Failed to generate trend report:", error.message);
      throw error;
    }
  }

  analyzeTrends(trendData) {
    if (trendData.length < 2) {
      return { status: 'insufficient_data' };
    }
    
    const latest = trendData[0];
    const previous = trendData[1];
    
    const overallChange = latest.overall - previous.overall;
    const stmtChange = latest.summary.statements.percent - previous.summary.statements.percent;
    const funcChange = latest.summary.functions.percent - previous.summary.functions.percent;
    const branchChange = latest.summary.branches.percent - previous.summary.branches.percent;
    
    return {
      status: overallChange >= 0 ? 'improving' : 'declining',
      overallChange: overallChange,
      changes: {
        statements: stmtChange,
        functions: funcChange,
        branches: branchChange
      },
      direction: {
        overall: overallChange > 0 ? '↗️' : overallChange < 0 ? '↘️' : '➡️',
        statements: stmtChange > 0 ? '↗️' : stmtChange < 0 ? '↘️' : '➡️',
        functions: funcChange > 0 ? '↗️' : funcChange < 0 ? '↘️' : '➡️',
        branches: branchChange > 0 ? '↗️' : branchChange < 0 ? '↘️' : '➡️'
      }
    };
  }

  calculatePercentage(covered, total) {
    return total === 0 ? 100 : Math.round((covered / total) * 100 * 100) / 100;
  }

  async generateSummaryReport() {
    try {
      logger.info("📋 Generating coverage summary report...");
      
      // Get latest coverage data
      const jsonPath = path.join(this.coverageDir, 'coverage-final.json');
      
      if (!fs.existsSync(jsonPath)) {
        throw new Error("Coverage data not found");
      }
      
      const rawData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const enhancedData = await this.enhanceCoverageData(rawData);
      
      // Store coverage history
      await this.storeCoverageHistory(enhancedData);
      
      // Create summary
      const summary = {
        timestamp: new Date().toISOString(),
        status: enhancedData.overall >= 80 ? 'PASS' : 'FAIL',
        overall: enhancedData.overall,
        summary: enhancedData.summary,
        files: {
          total: enhancedData.analysis.totalFiles,
          wellCovered: enhancedData.analysis.wellCoveredFiles,
          poorlyCovered: enhancedData.analysis.poorlyCoveredFiles
        },
        recommendations: enhancedData.analysis.recommendations,
        reports: {
          html: path.join(this.coverageDir, 'lcov-report', 'index.html'),
          json: path.join(this.coverageDir, 'coverage-final.json'),
          lcov: path.join(this.coverageDir, 'lcov.info')
        }
      };
      
      const summaryPath = path.join(this.reportsDir, `coverage-summary-${new Date().toISOString().split('T')[0]}.json`);
      fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
      
      logger.info(`📋 Summary report generated: ${summaryPath}`);
      
      // Log summary to console
      this.logCoverageSummary(summary);
      
      return summaryPath;
      
    } catch (error) {
      logger.error("❌ Failed to generate summary report:", error.message);
      throw error;
    }
  }

  logCoverageSummary(summary) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 COVERAGE SUMMARY REPORT');
    console.log('='.repeat(60));
    console.log(`Status: ${summary.status === 'PASS' ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Overall Coverage: ${summary.overall.toFixed(2)}%`);
    console.log(`Timestamp: ${summary.timestamp}`);
    console.log('\n📈 METRICS:');
    console.log(`  Statements: ${summary.summary.statements.covered}/${summary.summary.statements.total} (${summary.summary.statements.percent}%)`);
    console.log(`  Functions:  ${summary.summary.functions.covered}/${summary.summary.functions.total} (${summary.summary.functions.percent}%)`);
    console.log(`  Branches:   ${summary.summary.branches.covered}/${summary.summary.branches.total} (${summary.summary.branches.percent}%)`);
    console.log(`  Lines:      ${summary.summary.lines.covered}/${summary.summary.lines.total} (${summary.summary.lines.percent}%)`);
    
    console.log('\n📁 FILES:');
    console.log(`  Total: ${summary.files.total}`);
    console.log(`  Well Covered (≥80%): ${summary.files.wellCovered}`);
    console.log(`  Poorly Covered (<60%): ${summary.files.poorlyCovered}`);
    
    if (summary.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      summary.recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. [${rec.priority.toUpperCase()}] ${rec.message}`);
        console.log(`     Action: ${rec.action}`);
      });
    }
    
    console.log('\n📁 REPORTS AVAILABLE:');
    console.log(`  HTML Report: ${summary.reports.html}`);
    console.log(`  JSON Report: ${summary.reports.json}`);
    console.log(`  LCOV Report: ${summary.reports.lcov}`);
    console.log('='.repeat(60) + '\n');
  }
}

module.exports = CoverageReporter;
