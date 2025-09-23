import { loadEnvExample } from '../tools/envUtils.js';

export default function improvePromptTemplate(fileContent, relativeImport, errorLogs = '', envVariables = null) {
  // Load environment variables from .env.example or use defaults (optimized for testing)
  const environmentVars = envVariables || loadEnvExample(process.cwd(), true);

  return `
    You are an expert Jest test fixer.  
    Previous tests failed or coverage was too low.
    
    === FILE PATH IMPORT ===
    ${relativeImport}
    
    === CODE START ===
    ${fileContent}
    === CODE END ===
    
    === ERROR LOGS / UNCOVERED BRANCHES ===
    ${errorLogs}

    ==== Current Environment Example ====
    ${JSON.stringify(process.env, null, 2)}
    
    RULES FOR FIXING:
    1. **ANALYZE FAILURES**
     - Identify exactly why the test failed (wrong DB name, wrong status code, wrong error message, missing mock, schema not registered, model not exported).
     - Modify only what is needed to align with the actual implementation in the source file.
    
    2. **KEEP BEHAVIOR CONSISTENT WITH CODE**
     - If the code uses "mongodb://localhost:27017/testdb", tests must expect exactly "testdb".
     - If the code returns 'res.status(400).json({ message: "Invalid token." })', tests must expect exactly that.
     - Do not assume or invent behavior that is not present in the source code.
    
    3. **MOCK AND IMPORT ORDER (STRICT)**
     - Declare all mock function variables BEFORE assigning/using them to avoid TDZ errors ("Cannot access 'mockX' before initialization").
     - Call 'jest.mock(...)' for external modules BEFORE requiring/importing the target module so mocks apply correctly.
     - If the target module reads environment variables at import time, set process.env' BEFORE requiring it.  
     - Use 'jest.resetModules()' when re-importing a module in different scenarios to reset its state.
    
    4. **EXPORT AND MODEL HANDLING**
     - If the app defines a Mongoose model, ensure it is exported from the app/server file.
     - In tests, always import the exported model instead of calling 'mongoose.model('ModelName')' directly, to avoid "Schema hasn't been registered" or missing functions like 'deleteMany'.
    
    5. **COVERAGE IMPROVEMENT**
     - Add missing tests for uncovered branches, conditionals, and error handling.
     - Ensure all branches of try/catch blocks and all permission checks are tested (e.g., self vs. admin, valid vs. invalid token, success vs. failure cases).
    
    6. **MOCK STABILITY**
     - Ensure mocks are not reset incorrectly between tests.
     - Centralize 'jwt.verify' and 'jwt.sign' mocks so all routes behave consistently.
     - Mock 'mongoose.connect' properly before requiring the connection function to test DB connection logic.

    7. **ENVIRONMENT VARIABLES (SECURE AND DETERMINISTIC)**
     - ALWAYS use process.env.VARIABLE_NAME directly in test cases - never hardcode values or assume variables exist.
     - Environment variables are loaded from .env.example file to identify variable names (without revealing sensitive API keys).
     - Use the exact environment variables provided above in the ENVIRONMENT VARIABLES section.
     - Safe pattern for setting up test environment:
       \`\`\`js
       const ORIGINAL_ENV = process.env;
       beforeEach(() => {
         jest.resetModules();
         process.env = {
           ...ORIGINAL_ENV,
           NODE_ENV: 'test',
           MONGODB_URI: 'mongodb://localhost:27017/testdb',
           JWT_SECRET: 'test-jwt-secret-key-for-testing',
           FRONTEND_URL: 'http://localhost:5173',
           INTERNAL_API_KEY: 'test-internal-api-key',
           PORT: '3001',
           SOCKET_PORT: '5002',
           // Add other specific env vars as needed from the list above
         };
       });
       afterEach(() => {
         process.env = ORIGINAL_ENV;
         jest.clearAllMocks();
       });
       \`\`\`
     - If a module reads env variables at import time, set 'process.env' before requiring it inside each test case that needs different values.
     - Always use the specific environment variable names and values from the ENVIRONMENT VARIABLES section above.
     - Test cases MUST reference environment variables like process.env.JWT_SECRET, process.env.MONGODB_URI, process.env.FRONTEND_URL etc. using the exact values provided.
     - NEVER use hardcoded strings like 'your-jwt-secret' - always use process.env.VARIABLE_NAME.
    
    8. **OUTPUT CONSTRAINTS**
     - Output only valid Jest test code.
     - Do NOT include Markdown, explanations, or extra commentary.
     - Ensure the code is self-contained, runnable, and imports the correct model/app.
    
    STRICT FINAL INSTRUCTION:
    Rewrite or extend the test file so it matches the real code implementation, fixes failing assertions, properly handles exports and mocks, and improves coverage.  
    Do not fabricate behavior.  
    `;
}
