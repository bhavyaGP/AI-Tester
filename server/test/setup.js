require('dotenv').config({ path: '.env' });

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.mongoUrl = process.env.mongoUrl || "mongodb://localhost:27017/playpower_test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "keyboardcat";

// Increase timeout for async operations
jest.setTimeout(30000);

// Don't mock console.log for better debugging
// global.console = {
//   ...console,
//   log: jest.fn(), // Commented out to allow proper logging
// };
