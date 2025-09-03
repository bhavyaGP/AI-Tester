module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],

  // Coverage configuration
  collectCoverage: false, // Set to true to always collect coverage
  collectCoverageFrom: [
    'server/**/*.js',
    'sripts/**/*.js',
    '!node_modules/**',
    '!coverage/**',
    '!**/*.test.js',
    '!**/*.spec.js',
    '!**/jest.config.js'
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
    },
    // You can also set per-file thresholds
    './server/utils.js': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },

  // Setup files
  setupFilesAfterEnv: [],

  // Module paths
  moduleFileExtensions: ['js', 'json'],

  // Transform files
  transform: {},

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks after each test
  restoreMocks: true,

  // Verbose output
  verbose: true,

  // Test timeout
  testTimeout: 10000
};
