export default function controllerPromptTemplate(fileContent, relativeImport) {
    return `
    === CODE START ===
    ${fileContent}
    === CODE END ===

    CONTROLLER TESTING RULES:
    1) ANALYZE ACTUAL CONTROLLER IMPLEMENTATION
    - Identify the exact function signatures and parameters
    - Note the actual error handling pattern (try-catch, asyncHandler, etc.)
    - Identify what database operations are actually performed
    - Note the actual response patterns (res.status().json(), res.json(), etc.)

    2) MOCK DEPENDENCIES CORRECTLY
    - Mock the exact models imported in the controller
    - Mock the exact methods called on those models
    - Use mockResolvedValue for successful operations
    - Use mockRejectedValue for failed operations
    - Mock any middleware (like asyncHandler) if present
    - Define mock function variables before assigning them to objects to avoid TDZ errors

    3) TEST ACTUAL CODE PATHS ONLY
    - Test the actual conditional branches in the code
    - Test the actual error scenarios that can occur
    - Test the actual response formats used by the controller
    - Test the actual validation logic present in the code

    4) MATCH ACTUAL RESPONSE PATTERNS
    - If controller uses res.status(201).json(), test for 201 status
    - If controller uses res.json() without status, test for 200 status (default)
    - If controller uses res.status(500).json({ error: error.message }), test for that exact pattern
    - Match the exact error message format used in the code

    5) REQUEST/RESPONSE MOCKING
    - Use node-mocks-http or create minimal req/res objects
    - Set up req.body, req.params, req.user as needed by the controller
    - Mock res.status and res.json methods
    - Use beforeEach/afterEach to reset mocks

    6) DATABASE INTERACTION TESTING
    - Mock the exact database methods called in the controller
    - Test both success and failure scenarios for each database operation
    - Ensure mocks return data in the format expected by the controller
    - Test the actual query parameters used in database calls

    7) VALIDATION TESTING
    - Test only the validation logic that actually exists in the code
    - Test the actual error messages returned by validation
    - Test the actual status codes used for validation errors

    8) AVOID UNNECESSARY TESTS
    - Don't test scenarios that can't occur with the actual code
    - Don't test theoretical edge cases not handled by the code
    - Don't assume error handling patterns that aren't implemented
    - Focus on the actual conditional branches and error paths

    9) IMPORT AND ENV ORDER (STRICT)
    - Call jest.mock(...) for external modules BEFORE importing the controller.
    - If the controller reads env at import time, set process.env BEFORE requiring it. Use jest.resetModules() when re-importing.
    - Do not rely on a real .env file. Configure necessary env vars via process.env inside tests and restore them after each test.

    IMPORT PATH: ${relativeImport}

    Generate tests that will actually pass with the real controller implementation.
    `;
}
