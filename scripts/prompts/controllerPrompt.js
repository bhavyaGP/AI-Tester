export default function controllerPromptTemplate(fileContent, relativeImport, codePatterns = {}) {
    const { models = [], imports = [], exports = [] } = codePatterns;
    
    return `
    === CODE START ===
    ${fileContent}
    === CODE END ===

    === IMPORT INFORMATION ===
    Controller path: ${relativeImport}
    Detected models: ${models.join(', ')}
    All imports: ${imports.join(', ')}
    Exports: ${exports.join(', ')}

    CONTROLLER TESTING RULES:
    1) CORRECT IMPORT PATHS - CRITICAL FOR SUCCESS
    - Use CommonJS require() syntax for all imports in Jest tests
    - For controller: const { functionName } = require("${relativeImport}");
    - For models: Use correct relative paths from test file location
      * If test is in tests/server/controller/, model imports should be:
      * const ModelName = require("../../../server/models/modelname.model");
    - For other server modules:
      * const io = require("../../../server/socket.server");
      * const redis = require("../../../server/redis.connection");
    - Jest mocks should match the exact import paths used in the controller

    2) JEST MOCK SETUP (CRITICAL ORDER)
    - Place all jest.mock() calls at the TOP of the file, before any requires
    - Mock external modules first:
      ${models.map(model => `jest.mock("../../../server/models/${model}.model");`).join('\n      ')}
    - Then require the controller and dependencies
    - Use proper mock implementations for database models

    3) ANALYZE ACTUAL CONTROLLER IMPLEMENTATION
    - Identify the exact function signatures and parameters
    - Note the actual error handling pattern (try-catch, asyncHandler, etc.)
    - Identify what database operations are actually performed
    - Note the actual response patterns (res.status().json(), res.json(), etc.)

    4) MOCK DEPENDENCIES CORRECTLY
    - Mock the exact models imported in the controller: ${models.join(', ')}
    - Mock the exact methods called on those models
    - Use mockResolvedValue for successful operations
    - Use mockRejectedValue for failed operations
    - Mock any middleware (like asyncHandler) if present
    - Define mock function variables before assigning them to objects to avoid TDZ errors

    5) TEST ACTUAL CODE PATHS ONLY
    - Test the actual conditional branches in the code
    - Test the actual error scenarios that can occur
    - Test the actual response formats used by the controller
    - Test the actual validation logic present in the code

    6) MATCH ACTUAL RESPONSE PATTERNS
    - If controller uses res.status(201).json(), test for 201 status
    - If controller uses res.json() without status, test for 200 status (default)
    - If controller uses res.status(500).json({ error: error.message }), test for that exact pattern
    - Match the exact error message format used in the code

    7) REQUEST/RESPONSE MOCKING
    - Use node-mocks-http or create minimal req/res objects
    - Set up req.body, req.params, req.user as needed by the controller
    - Mock res.status and res.json methods
    - Use beforeEach/afterEach to reset mocks

    8) DATABASE INTERACTION TESTING
    - Mock the exact database methods called in the controller
    - Test both success and failure scenarios for each database operation
    - Ensure mocks return data in the format expected by the controller
    - Test the actual query parameters used in database calls

    9) VALIDATION TESTING
    - Test only the validation logic that actually exists in the code
    - Test the actual error messages returned by validation
    - Test the actual status codes used for validation errors

    10) AVOID UNNECESSARY TESTS
    - Don't test scenarios that can't occur with the actual code
    - Don't test theoretical edge cases not handled by the code
    - Don't assume error handling patterns that aren't implemented
    - Focus on the actual conditional branches and error paths

    11) ENVIRONMENT SETUP
    - Set up test environment variables using process.env
    - Use beforeEach to reset mocks and environment
    - Use afterEach to clean up mocks

    CRITICAL EXAMPLE FOR IMPORT PATHS:
    \`\`\`javascript
    // Mock external modules FIRST
    jest.mock("../../../server/models/chat.model");
    jest.mock("../../../server/models/doubt.model");
    jest.mock("../../../server/socket.server");
    jest.mock("../../../server/redis.connection");

    // Then require modules
    const { joinchat, getChatHistory, sendMessage } = require("${relativeImport}");
    const Chat = require("../../../server/models/chat.model");
    const Doubt = require("../../../server/models/doubt.model");
    const io = require("../../../server/socket.server");
    const redis = require("../../../server/redis.connection");
    \`\`\`

    Generate complete Jest test code that will pass on first attempt with correct import paths.
    Output ONLY the Jest test code without markdown formatting or explanations.
    `;
}
