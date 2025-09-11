module.exports = function jestPromptTemplate(fileContent, relativeImport) {
    return `
=== CODE START ===
${fileContent}
=== CODE END ===

RULES (MANDATORY):
1) IMPORT THE TARGET USING THE PROVIDED RELATIVE PATH
- Always import the target module using the exact provided path: ${relativeImport}
- Use ES module \`import\` if the file contains \`import\`/ \`export\`; otherwise use CommonJS \`require()\`.

2) EXPORT DETECTION (STRICT)
- FIRST, analyze ${fileContent} and explicitly list the detected exports (functions, classes, router, etc.). Base ALL tests strictly on those detected exports. Do not invent new exports.

3) DETECT ROUTER VS FUNCTIONS
- If the file exports an Express Router (e.g., \`export default router\` or \`module.exports = router\`), generate a \`supertest\` suite that mounts the router on a fresh \`express()\` app and exercises each route.
- If the file exports functions (controllers, services, helpers), generate unit tests that call exported functions directly.
- If detection is unclear, produce both: unit tests for exported functions and a minimal router mounting suite. Both must import the target via ${relativeImport}.

4) MOCK EXTERNAL DEPENDENCIES
- For third-party libraries (mongoose, axios, fs, etc.), always use \`jest.mock()\` and mockResolvedValue / mockRejectedValue for async calls. 
- Do NOT assert against real library error messages. Instead, configure mocks to throw \`new Error("mock error")\` and assert handling in your code (e.g., logging, next(err)).

5) COVERAGE REQUIREMENTS
- Include tests for happy paths and negative/error cases for every exported symbol.
- Cover edge cases (empty arrays, missing fields, boundary numbers/strings).
- Exercise conditional branches by forcing dependency returns/throws.
- For controllers, assert that \`next(err)\` is called on errors.

6) ROUTE TEST DETAILS (when generating router tests)
- Use \`supertest\` to send requests to the mounted app.
- Mock controllers (if routes delegate to controllers) and assert controller invocation and response forwarding.
- Provide at least one test for protected routes with successful auth and one for unauthorized access.

7) UNIT TEST DETAILS (when generating unit/controller tests)
- Use \`node-mocks-http\` or minimal \`req/res\` objects. Show \`beforeEach\`/ \`afterEach\` to reset mocks: \`jest.clearAllMocks()\`.
- For async controllers, await the call and assert status and JSON payloads.

8) DB & INTEGRATION (ONLY when necessary)
- Avoid real DB connections. If real DB behavior is required, use \`mongodb-memory-server\` with proper \`beforeAll\`/ \`afterAll\` hooks.

9) MOCkS & SPYING
- Use \`jest.mock()\` for imported models/services and configure return values or throw errors per test.
- Use \`jest.spyOn()\` or mock implementations to assert calls.

10) TEST STRUCTURE
- Group tests with \`describe\` and use \`it\`/ \`test\` for behaviors with meaningful descriptions.
- Provide \`beforeEach\`/ \`afterEach\` hooks to reset environment and clear mocks.

11) FAIL-SAFE
- If unable to detect exports precisely, generate both small unit tests and a router mounting \`supertest\` suite (both using ${relativeImport}).

12) OUTPUT CONSTRAINTS
- Output ONLY the full, runnable Jest test file content. Do NOT include any extra commentary, explanation, or Markdown. The test file must import the target using \`${relativeImport}\` exactly.

STRICT FINAL INSTRUCTION:
- Do NOT fabricate behavior. Mock dependencies instead of assuming library error messages. Return only valid Jest test code.
`;
};
