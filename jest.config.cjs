module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],

  // Coverage configuration
  collectCoverage: true, // Set to true to always collect coverage
  collectCoverageFrom: [
    'server/**/*.js',
    '!server/**/*.test.js',
    '!server/**/*.spec.js'
  ],

  // Files to ignore completely
  coveragePathIgnorePatterns: [
    'node_modules/',
    'coverage/',
    'sripts/',
    'tests/',
    'jest.config.js'
  ],

  // Coverage output directory
  coverageDirectory: 'coverage',

  // Coverage reporters
  coverageReporters: [
    'text',           // Console output
    'text-summary',   // Brief console summary
    'lcov',          // For CI/CD integration
    'html',          // HTML report
    'json',          // JSON format
    'clover'         // XML format
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },

  // Setup files
  setupFilesAfterEnv: [],

  // Module paths
  moduleFileExtensions: ['js', 'json'],

  // Transform files
  // Use babel-jest to transform ES module syntax so tests can use import
  transform: {
    '^.+\\.js$': 'babel-jest'
  },

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks after each test
  restoreMocks: true,

  // Verbose output
  verbose: true,

  // Test timeout
  testTimeout: 10000
};