import { cleanGeneratedCode, validateGeneratedCode } from "./tools/codeCleanup.js";

// Test cases for the cleanup function
const testCases = [
  {
    name: "Basic markdown removal",
    input: "```javascript\nconst test = 'hello';\n```",
    expected: "const test = 'hello';"
  },
  {
    name: "With explanatory text before",
    input: "Here's the test code:\n```javascript\nconst test = 'hello';\n```",
    expected: "const test = 'hello';"
  },
  {
    name: "With explanatory text after",
    input: "```javascript\nconst test = 'hello';\n```\nThis test checks the functionality.",
    expected: "const test = 'hello';"
  },
  {
    name: "No markdown blocks",
    input: "const test = 'hello';",
    expected: "const test = 'hello';"
  },
  {
    name: "Complex case with jest",
    input: "```javascript\nconst { myFunc } = require('../src/myFunc');\n\ndescribe('myFunc', () => {\n  test('should work', () => {\n    expect(myFunc()).toBe(true);\n  });\n});\n```",
    expected: "const { myFunc } = require('../src/myFunc');\n\ndescribe('myFunc', () => {\n  test('should work', () => {\n    expect(myFunc()).toBe(true);\n  });\n});"
  }
];

console.log("🧪 Testing code cleanup function...\n");

for (const testCase of testCases) {
  console.log(`Testing: ${testCase.name}`);
  const result = cleanGeneratedCode(testCase.input);
  const trimmedResult = result.trim();
  const trimmedExpected = testCase.expected.trim();
  
  if (trimmedResult === trimmedExpected) {
    console.log("✅ PASS");
  } else {
    console.log("❌ FAIL");
    console.log(`Expected: "${trimmedExpected}"`);
    console.log(`Got: "${trimmedResult}"`);
  }
  
  // Test validation
  const issues = validateGeneratedCode(result);
  if (issues.length > 0) {
    console.log(`⚠️ Validation issues: ${issues.join(', ')}`);
  }
  
  console.log();
}

console.log("✅ Code cleanup tests completed!");