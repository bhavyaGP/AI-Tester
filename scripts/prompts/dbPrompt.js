export default function dbPromptTemplate(fileContent, relativeImport) {
return `
You are an expert in Jest testing for database connections.
Write Jest tests for the database connection function below.

=== CODE START ===
${fileContent}
=== CODE END ===

RULES:
1. **ANALYZE IMPLEMENTATION**
 - Identify the connection function name and its parameters (e.g., URI, options).
 - Note connection method (e.g., mongoose.connect, mysql.createConnection, etc.), success handling (e.g., logging), and failure handling (e.g., error logging).

2. **MOCKING**
 - Mock the database library's connection method (e.g., jest.fn() for mongoose.connect or equivalent).
 - Mock console.log or other logging functions to capture outputs.
 - Use mockResolvedValue for successful connections and mockRejectedValue for failures.
 - IMPORTANT: Call jest.mock(...) BEFORE importing the module under test.

3. **TEST CASES**
 - Successful connection with default settings.
 - Successful connection with custom environment variables (e.g., URI from process.env).
 - Connection failure that logs the error appropriately.
 - Reset mocks and environment variables between tests.
 - If the module reads env at import time, set process.env BEFORE requiring it; use jest.resetModules() between different env scenarios.

4. **ENVIRONMENT VARIABLES (NO REAL .env)**
 - Do NOT read from a real .env file. Define env vars inside tests using process.env.
 - Pattern:
   const ORIGINAL_ENV = process.env;
   beforeEach(() => { jest.resetModules(); process.env = { ...ORIGINAL_ENV, NODE_ENV: 'test' }; });
   afterEach(() => { process.env = ORIGINAL_ENV; jest.clearAllMocks(); });

5. **OUTPUT**
 - Output only Jest test code.
 - Import the module with ${relativeImport}.
 - No Markdown, only runnable code.
`;
}
