export default function improvePromptTemplate(fileContent, relativeImport, errorLogs) {
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

RULES FOR FIXING:
1. **ANALYZE FAILURES**
   - Identify why the test failed (wrong DB name, wrong status code, wrong error message, missing mock).
   - Modify only what is needed to align with the actual implementation.

2. **KEEP BEHAVIOR CONSISTENT WITH CODE**
   - If the code uses "mongodb://localhost:27017/testdb", tests must expect exactly "testdb".
   - If the code returns res.status(400).json({ message: "Invalid token." }), tests must expect exactly that.
   - Do not assume or invent patterns not in the code.

3. **MOCK AND IMPORT ORDER (STRICT)**
   - Declare all mock function variables BEFORE assigning/using them to avoid TDZ errors ("Cannot access 'mockX' before initialization").
   - Call jest.mock(...) for external modules BEFORE requiring/importing the target module so mocks apply.
   - If the target reads environment variables at import time, set process.env BEFORE requiring it. Use jest.resetModules() when re-importing in different scenarios.

4. **COVERAGE IMPROVEMENT**
   - Add missing tests for uncovered branches, conditionals, and error handling.
   - Ensure all branches of try/catch and permission checks are tested.

5. **MOCK STABILITY**
   - Ensure mocks are not reset incorrectly between tests.
   - Centralize jwt.verify / jwt.sign mocks so all routes behave consistently.

6. **ENVIRONMENT VARIABLES (SECURE AND DETERMINISTIC)**
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

7. **OUTPUT CONSTRAINTS**
   - Output only valid Jest test code.
   - Do NOT include Markdown, explanations, or extra commentary.
   - Ensure the code is self-contained and runnable.

STRICT FINAL INSTRUCTION:
Rewrite or extend the test file so it matches the real code implementation, fixes failing assertions, and improves coverage.  
Do not fabricate behavior.  
`;
}
