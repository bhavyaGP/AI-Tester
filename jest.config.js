// jest.config.js
module.exports = {
  collectCoverage: true,
  collectCoverageFrom: ["server/**/*.js"], // measure coverage only from server/
  coverageDirectory: "coverage",
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testEnvironment: "node",
};
