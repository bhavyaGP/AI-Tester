const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");
const winston = require("winston");

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.simple()
  ),
  transports: [new winston.transports.Console()]
});

class TestGenerationAgent {
  constructor() {
    this.mockMode = !process.env.GEMINI_API;
    if (!this.mockMode) {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API);
      this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    }
    this.maxRetries = 3;
    this.retryDelay = 1000;
  }

  async generateTests(filePath) {
    logger.info(`🔬 Generating tests for: ${filePath}`);

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');
    if (!fileContent.trim()) {
      logger.warn(`⚠️ Empty file skipped: ${filePath}`);
      return null;
    }

    if (this.mockMode) {
      return this.createPlaceholderTest(filePath);
    }

    const prompt = this.createTestGenerationPrompt(fileContent, filePath);
    const testContent = await this.generateWithRetry(prompt);

    if (testContent && this.validateTestContent(testContent)) {
      logger.info(`✅ Tests generated successfully for: ${filePath}`);
      return testContent;
    }

    throw new Error('Generated test content is invalid');
  }

  async updateTests(fileData) {
    logger.info(`🔄 Updating tests for: ${fileData.file}`);
    const filePath = fileData.file;
    const changes = fileData.changes;

    if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

    const fileContent = fs.readFileSync(filePath, 'utf8');
    const existingTestPath = this.getTestFilePath(filePath);
    let existingTestContent = '';
    if (fs.existsSync(existingTestPath)) existingTestContent = fs.readFileSync(existingTestPath, 'utf8');

    if (this.mockMode) {
      return existingTestContent + '\n' + this.createPlaceholderTest(filePath, true);
    }

    const prompt = this.createTestUpdatePrompt(fileContent, existingTestContent, changes, filePath);
    const updatedTestContent = await this.generateWithRetry(prompt);

    if (updatedTestContent && this.validateTestContent(updatedTestContent)) {
      logger.info(`✅ Tests updated successfully for: ${filePath}`);
      return updatedTestContent;
    }

    throw new Error('Updated test content is invalid');
  }

  async generateTestsWithMutation(filePath, coverageData) {
    logger.info(`🧬 Generating mutation tests for: ${filePath}`);

    if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

    if (this.mockMode) {
      return this.createPlaceholderTest(filePath, false, coverageData);
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');
    const existingTestPath = this.getTestFilePath(filePath);
    let existingTestContent = '';
    if (fs.existsSync(existingTestPath)) existingTestContent = fs.readFileSync(existingTestPath, 'utf8');

    const prompt = this.createMutationTestPrompt(fileContent, existingTestContent, coverageData, filePath);
    const mutatedTestContent = await this.generateWithRetry(prompt);

    if (mutatedTestContent && this.validateTestContent(mutatedTestContent)) {
      logger.info(`✅ Mutation tests generated successfully for: ${filePath}`);
      return mutatedTestContent;
    }

    throw new Error('Mutated test content is invalid');
  }

  createTestGenerationPrompt(fileContent, relativePath) {
    return `
You are an expert JavaScript testing assistant specializing in comprehensive Jest unit testing.

=== SOURCE CODE ===
File Path: ${relativePath}
${fileContent}

=== TESTING REQUIREMENTS ===
Generate COMPLETE and EXECUTABLE Jest unit tests with the following requirements:

1. COVERAGE REQUIREMENTS:
   - Target: 95%+ line coverage, 90%+ function coverage, 85%+ branch coverage
   - Test ALL exported functions, classes, methods, and modules
   - Cover ALL conditional branches and logic paths
   - Test ALL error scenarios and edge cases

2. TEST STRUCTURE:
   - Use proper describe() blocks for logical grouping
   - Use descriptive test names that explain the scenario
   - Import using: require('../../${relativePath}')
   - Follow AAA pattern: Arrange, Act, Assert

3. TEST SCENARIOS:
   - Happy path scenarios (normal operation)
   - Edge cases (empty inputs, null, undefined, extreme values)
   - Error conditions (invalid inputs, system failures)
   - Boundary conditions (min/max values, limits)
   - Asynchronous operation handling (if applicable)

4. MOCKING AND SETUP:
   - Mock external dependencies (databases, APIs, file system)
   - Mock Express middleware and request/response objects
   - Use beforeEach/afterEach for setup and cleanup
   - Mock console methods if needed

5. ASSERTION QUALITY:
   - Use specific matchers (toEqual, toThrow, toHaveBeenCalledWith)
   - Verify return values, side effects, and state changes
   - Check error messages and types
   - Validate function call counts and parameters

6. SPECIAL CONSIDERATIONS:
   - For Express routes: use supertest for integration testing
   - For database operations: mock database connections
   - For async functions: properly handle promises and async/await
   - For middleware: test next() calls and error propagation

OUTPUT REQUIREMENTS:
- Return ONLY executable Jest test code
- NO explanations, comments, or markdown
- NO code block markers (\`\`\`) 
- Ensure all imports and mocks are properly set up
- Make tests deterministic and independent

EXAMPLE STRUCTURE:
const request = require('supertest');
const moduleName = require('../../${relativePath}');

describe('Module Name', () => {
  describe('Function Name', () => {
    test('should handle normal case', () => {
      // Test implementation
    });
    
    test('should handle error case', () => {
      // Test implementation
    });
  });
});
`;
  }

  createTestUpdatePrompt(fileContent, existingTestContent, changes, relativePath) {
    return `
You are an expert JavaScript testing assistant. Update existing Jest tests based on code changes.

=== CURRENT SOURCE CODE ===
File Path: ${relativePath}
${fileContent}

=== EXISTING TESTS ===
${existingTestContent}

=== CODE CHANGES ===
${JSON.stringify(changes, null, 2)}

=== UPDATE REQUIREMENTS ===
1. PRESERVE existing tests that are still valid
2. UPDATE tests for modified functions with new logic
3. ADD tests for new functions, methods, or code paths
4. REMOVE tests for deleted functions (if any)
5. MAINTAIN 90%+ coverage target
6. ENSURE all tests remain executable and pass

=== CHANGE ANALYSIS ===
- Added Functions: ${changes.addedFunctions ? changes.addedFunctions.map(f => f.name).join(', ') : 'None'}
- Modified Functions: ${changes.modifiedFunctions ? changes.modifiedFunctions.map(f => f.name).join(', ') : 'None'}
- Deleted Functions: ${changes.deletedFunctions ? changes.deletedFunctions.map(f => f.name).join(', ') : 'None'}

=== OUTPUT REQUIREMENTS ===
Return the COMPLETE updated test file with:
- All existing valid tests preserved
- New tests for added functionality
- Updated tests for modified functionality
- Proper imports and mocks maintained
- NO explanations or markdown, just executable code

Use import path: require('../../${relativePath}')
`;
  }

  createMutationTestPrompt(fileContent, existingTestContent, coverageData, relativePath) {
    const uncoveredLines = this.identifyUncoveredLines(coverageData);

    return `
You are an expert JavaScript testing assistant focusing on improving test coverage through mutation testing.

=== SOURCE CODE ===
File Path: ${relativePath}
${fileContent}

=== EXISTING TESTS ===
${existingTestContent}

=== COVERAGE ANALYSIS ===
Current Coverage: ${JSON.stringify(coverageData && coverageData.summary ? coverageData.summary : {}, null, 2)}
Uncovered Lines: ${uncoveredLines.join(', ')}

=== MUTATION TESTING REQUIREMENTS ===
Enhance existing tests to achieve 90%+ coverage by:

1. TARGETING UNCOVERED CODE:
   - Focus on lines: ${uncoveredLines.join(', ')}
   - Add tests for uncovered branches
   - Test error conditions and edge cases

2. MUTATION STRATEGIES:
   - Boundary value testing (off-by-one errors)
   - Error injection and handling
   - Alternative execution paths
   - Input validation edge cases

3. TEST ENHANCEMENT:
   - Add more assertions to existing tests
   - Create specific tests for uncovered scenarios
   - Improve error condition testing
   - Add integration scenarios

4. QUALITY REQUIREMENTS:
   - All new tests must be independent
   - Mock external dependencies properly
   - Use descriptive test names
   - Follow arrange-act-assert pattern

=== OUTPUT REQUIREMENTS ===
Return COMPLETE test file with:
- All existing tests preserved
- New tests targeting uncovered lines
- Enhanced assertions and scenarios
- Maintained code organization
- NO explanations, just executable Jest code

Use import path: require('../../${relativePath}')
`;
  }

  identifyUncoveredLines(coverageData) {
    const uncovered = [];
    if (!coverageData) return uncovered;

    if (coverageData.statementMap && coverageData.s) {
      Object.keys(coverageData.s).forEach(key => {
        if (coverageData.s[key] === 0) {
          const stmt = coverageData.statementMap[key];
          if (stmt && stmt.start) uncovered.push(stmt.start.line);
        }
      });
    }

    return [...new Set(uncovered)].sort((a, b) => a - b);
  }

  async generateWithRetry(prompt, retryCount = 0) {
    if (this.mockMode) throw new Error('generateWithRetry should not be called in mock mode');

    try {
      const result = await this.model.generateContent(prompt);
      const content = result.response.text();
      if (!content || content.trim().length === 0) throw new Error('Empty response from AI model');
      return this.cleanTestContent(content);
    } catch (error) {
      if (retryCount < this.maxRetries) {
        logger.warn(`⚠️ Retry ${retryCount + 1}/${this.maxRetries} for test generation: ${error.message}`);
        await this.delay(this.retryDelay * (retryCount + 1));
        return this.generateWithRetry(prompt, retryCount + 1);
      }
      throw new Error(`Failed after ${this.maxRetries} retries: ${error.message}`);
    }
  }

  cleanTestContent(content) {
    let cleaned = content.replace(/```javascript\s*/g, '').replace(/```\s*/g, '');
    cleaned = cleaned.trim();
    cleaned = cleaned.replace(/import\s+.*\s+from\s+['"]([^'"]+)['"]/g, "const $1 = require('$1')");
    return cleaned;
  }

  validateTestContent(content) {
    if (!content || content.trim().length === 0) return false;
    const hasDescribe = content.includes('describe(');
    const hasTest = content.includes('test(') || content.includes('it(');
    const hasRequire = content.includes('require(');
    const hasExpect = content.includes('expect(');
    if (!hasDescribe || !hasTest || !hasRequire || !hasExpect) {
      logger.warn('⚠️ Generated test content missing required patterns');
      return false;
    }

    try {
      const syntaxCheck = content.replace(/require\(['"][^'\"]*['"]\)/g, '{}');
      new Function(syntaxCheck);
      return true;
    } catch (error) {
      logger.warn('⚠️ Generated test content has syntax errors:', error.message);
      return false;
    }
  }

  getTestFilePath(sourceFilePath) {
    const relativePath = path.relative(process.cwd(), sourceFilePath).replace(/\\/g, '/');
    return path.join('tests', relativePath.replace('.js', '.test.js'));
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async analyzeTestComplexity(testContent) {
    const lines = testContent.split('\n');
    const analysis = { testCount: 0, describeBlocks: 0, expectations: 0, mocks: 0, asyncTests: 0, complexity: 'low' };
    lines.forEach(line => {
      if (line.includes('test(') || line.includes('it(')) analysis.testCount++;
      if (line.includes('describe(')) analysis.describeBlocks++;
      if (line.includes('expect(')) analysis.expectations++;
      if (line.includes('jest.mock') || line.includes('.mockImplementation')) analysis.mocks++;
      if (line.includes('async') || line.includes('await')) analysis.asyncTests++;
    });

    if (analysis.testCount > 10 || analysis.mocks > 3 || analysis.asyncTests > 5) analysis.complexity = 'high';
    else if (analysis.testCount > 5 || analysis.mocks > 1 || analysis.asyncTests > 2) analysis.complexity = 'medium';
    return analysis;
  }

  getTestMetrics(testContent) {
    const lines = testContent.split('\n').filter(l => l.trim().length > 0);
    return {
      totalLines: lines.length,
      testCases: (testContent.match(/test\(|it\(/g) || []).length,
      describeBlocks: (testContent.match(/describe\(/g) || []).length,
      assertions: (testContent.match(/expect\(/g) || []).length,
      mocks: (testContent.match(/jest\.mock|\.mock\w+/g) || []).length,
      asyncOperations: (testContent.match(/async|await/g) || []).length
    };
  }

  createPlaceholderTest(filePath, append = false, coverageData = null) {
    const rel = filePath.replace(/\\/g, '/');
    const importPath = `../../${rel}`;
    const testName = `placeholder tests for ${path.basename(filePath)}`;
    const coverageNote = coverageData ? `// targets uncovered lines: ${JSON.stringify(coverageData.statementMap || {})}` : '';

    const content = `const moduleUnderTest = require('${importPath}');\n\n` +
      `describe('${testName}', () => {\n` +
      `  test('module should load without throwing', () => {\n` +
      `    expect(() => require('${importPath}')).not.toThrow();\n` +
      `  });\n` +
      `  test('basic type check', () => {\n` +
      `    expect(typeof moduleUnderTest).not.toBe('undefined');\n` +
      `  });\n` +
      `});\n\n${coverageNote}\n`;

    return content;
  }
}

module.exports = TestGenerationAgent;
