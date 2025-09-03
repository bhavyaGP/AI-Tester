# Test Coverage Guide

## Overview
This project uses Jest for testing with comprehensive coverage reporting to ensure code quality and test completeness.

## Available Commands

### Basic Testing
```bash
npm test                    # Run tests without coverage
```

### Coverage Commands
```bash
npm run test:coverage       # Run tests with coverage (terminal output)
npm run test:coverage:html  # Generate HTML coverage report
npm run test:coverage:watch # Run tests with coverage in watch mode
```

## Coverage Reports

### 1. Terminal Output
When you run `npm run test:coverage`, you'll see a table showing:
- **File**: The file being tested
- **% Stmts**: Percentage of statements executed
- **% Branch**: Percentage of branches taken
- **% Funcs**: Percentage of functions called
- **% Lines**: Percentage of lines executed
- **Uncovered Line #s**: Specific line numbers not covered

### 2. HTML Report
Run `npm run test:coverage:html` to generate a detailed HTML report in the `coverage/` directory.
Open `coverage/index.html` in your browser to see:
- Interactive file-by-file coverage
- Line-by-line highlighting of covered/uncovered code
- Detailed branch coverage information

### 3. LCOV Report
The `coverage/lcov.info` file is generated for integration with CI/CD tools and code quality services.

## Coverage Thresholds

Current thresholds are set to 70% for all metrics:
- Statements: 70%
- Branches: 70%
- Functions: 70%
- Lines: 70%

Tests will fail if coverage falls below these thresholds.

## Coverage Types Explained

### Statement Coverage
Measures whether each statement in your code has been executed.
```javascript
function example(x) {
  console.log("This is a statement");  // ✓ Covered if function is called
  return x * 2;                        // ✓ Covered if function is called
}
```

### Branch Coverage
Measures whether each branch (if/else, switch cases, ternary operators) has been taken.
```javascript
function example(x) {
  if (x > 0) {        // Branch 1: needs x > 0 test
    return "positive";
  } else {            // Branch 2: needs x <= 0 test
    return "negative";
  }
}
```

### Function Coverage
Measures whether each function has been called.
```javascript
function usedFunction() {     // ✓ Covered if called
  return "used";
}

function unusedFunction() {   // ✗ Not covered if never called
  return "unused";
}
```

### Line Coverage
Measures whether each executable line has been run.

## Best Practices

### 1. Test Organization
```javascript
describe('Module Name', () => {
  describe('functionName', () => {
    test('should handle normal case', () => {
      // Test normal behavior
    });

    test('should handle edge case', () => {
      // Test edge cases
    });

    test('should handle error case', () => {
      // Test error conditions
    });
  });
});
```

### 2. Achieving Good Coverage
- Test all public functions
- Test error conditions and edge cases
- Test all conditional branches
- Mock external dependencies
- Test async operations

### 3. Coverage Goals
- Start with 70% coverage minimum
- Aim for 80-90% for critical modules
- 100% coverage isn't always necessary or practical
- Focus on meaningful tests over coverage percentage

## Configuration Files

### package.json
Coverage configuration is included in the Jest section:
```json
"jest": {
  "collectCoverageFrom": [
    "server/**/*.js",
    "sripts/**/*.js",
    "!**/*.test.js"
  ],
  "coverageThreshold": {
    "global": {
      "statements": 70,
      "branches": 70,
      "functions": 70,
      "lines": 70
    }
  }
}
```

### jest.config.js
More detailed configuration options are available in the dedicated config file.

## Ignoring Files from Coverage

Files are excluded from coverage in the `collectCoverageFrom` patterns:
- Test files (`**/*.test.js`, `**/*.spec.js`)
- Node modules
- Configuration files
- Coverage reports directory

## Integration with CI/CD

The LCOV report can be used with:
- GitHub Actions
- GitLab CI
- Jenkins
- Codecov
- Coveralls

Example GitHub Action:
```yaml
- name: Run tests with coverage
  run: npm run test:coverage

- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v2
  with:
    file: ./coverage/lcov.info
```

## Troubleshooting

### Low Coverage Issues
1. Check which files are not covered in the report
2. Add tests for uncovered functions
3. Test error paths and edge cases
4. Ensure all branches are tested

### Performance Issues
If coverage collection is slow:
1. Limit `collectCoverageFrom` patterns
2. Use `--coverage` flag only when needed
3. Consider using `--changedFiles` flag for faster feedback

## Viewing Coverage Reports

### HTML Report
1. Run `npm run test:coverage:html`
2. Open `coverage/index.html` in your browser
3. Navigate through files to see detailed coverage

### VS Code Extensions
- Jest Runner: Run individual tests
- Coverage Gutters: Show coverage in editor
- Jest: Syntax highlighting and IntelliSense
