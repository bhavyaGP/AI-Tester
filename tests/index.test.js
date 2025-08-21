```javascript
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");

jest.mock("child_process");
jest.mock("fs");
jest.mock("@google/generative-ai");

const mockExecSync = execSync;
const mockFs = fs;
const mockPath = path;
const mockGoogleGenerativeAI = GoogleGenerativeAI;


describe("getChangedFiles", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return an empty array if no git diff command is available", () => {
    process.env.BASE_SHA = undefined;
    process.env.HEAD_SHA = undefined;
    process.env.GITHUB_BASE_REF = undefined;
    mockExecSync.mockImplementation(() => { throw new Error("command not found")});
    expect(getChangedFiles()).toEqual([]);
  });

  it("should handle git diff errors gracefully", () => {
    mockExecSync.mockImplementation(() => { throw new Error("git error")});
    expect(getChangedFiles()).toEqual([]);
  });

  it("should return changed files from git diff", () => {
    process.env.BASE_SHA = "base";
    process.env.HEAD_SHA = "head";
    mockExecSync.mockReturnValueOnce("file1.js\nfile2.js");
    expect(getChangedFiles()).toEqual(["file1.js", "file2.js"]);
  });

    it("should return changed files from git diff with GITHUB_BASE_REF", () => {
    process.env.GITHUB_BASE_REF = "main";
    mockExecSync.mockReturnValueOnce("file1.js\nfile2.js");
    expect(getChangedFiles()).toEqual(["file1.js", "file2.js"]);
  });

  it("should handle empty git diff output", () => {
    process.env.BASE_SHA = "base";
    process.env.HEAD_SHA = "head";
    mockExecSync.mockReturnValueOnce("");
    expect(getChangedFiles()).toEqual([]);
  });

    it("should return staged, unstaged, and untracked files if HEAD~1 fails", () => {
    mockExecSync.mockImplementationOnce(() => { throw new Error("git error")})
    .mockImplementationOnce(() => "staged.js")
    .mockImplementationOnce(() => "unstaged.js")
    .mockImplementationOnce(() => "untracked.js");
    expect(getChangedFiles()).toEqual(["staged.js", "unstaged.js", "untracked.js"]);
  });

});

describe("jestPromptTemplate", () => {
  it("should return a properly formatted prompt", () => {
    const fileContent = "console.log('hello')";
    const expectedPrompt = `
You are an expert JavaScript testing assistant.
Your job is to generate **complete and executable Jest unit tests** for the given code.
=== CODE START ===
console.log('hello')
=== CODE END ===
TEST REQUIREMENTS:
- Use the Jest testing framework
- Cover ALL functions, methods, and exported modules in the file
- Organize tests using 'describe' and 'it/test' blocks
- Add meaningful test descriptions
- Include positive (expected behavior) and negative (error/invalid input) cases
- Test edge cases and boundary conditions
- Validate error handling (invalid params, wrong operations, etc.)
- Ensure generated code is executable Jest test code
IMPORTANT RESTRICTIONS:
- Do NOT include explanations, comments, or extra text
- Do NOT include markdown (no \`\`\` markers, no formatting)
- Output ONLY pure Jest test code
`;
    expect(jestPromptTemplate(fileContent)).toBe(expectedPrompt);
  });
});


describe("generateTests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GEMINI_API = "test-api-key";
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue("console.log('hello');");
    mockGoogleGenerativeAI.mockImplementation(() => ({
      getGenerativeModel: () => ({
        generateContent: () => Promise.resolve({ response: { text: () => "test-jest-code" } }),
      }),
    }));
    mockPath.basename.mockReturnValue("testFile");
    mockPath.join.mockReturnValue("tests/testFile.test.js");
    mockPath.dirname.mockReturnValue("tests");

  });

  it("should handle no changed files", async () => {
    const consoleLogSpy = jest.spyOn(console, "log");
    mockFs.readFileSync.mockReturnValue('');
    getChangedFiles.mockReturnValue([]);
    await generateTests();
    expect(consoleLogSpy).toHaveBeenCalledWith("ℹ️  No JS files changed under server/.");

  });

  it("should generate and write tests to file", async () => {
    const consoleLogSpy = jest.spyOn(console, 'log');
    const mockMkdirSync = jest.spyOn(mockFs, 'mkdirSync');
    const mockWriteFileSync = jest.spyOn(mockFs, 'writeFileSync');
    getChangedFiles.mockReturnValue(["testFile.js"]);
    await generateTests();
    expect(consoleLogSpy).toHaveBeenCalledWith("⚡ Generating tests for: testFile.js");
    expect(mockMkdirSync).toHaveBeenCalledWith('tests', {recursive: true});
    expect(mockWriteFileSync).toHaveBeenCalledWith("tests/testFile.test.js", "test-jest-code");
  });


  it("should handle errors during test generation", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error");
    mockGoogleGenerativeAI.mockImplementation(() => ({
      getGenerativeModel: () => ({
        generateContent: () => Promise.reject(new Error("test error")),
      }),
    }));
    getChangedFiles.mockReturnValue(["testFile.js"]);
    await generateTests();
    expect(consoleErrorSpy).toHaveBeenCalledWith("⚠️  Failed to generate/write tests for testFile.js:", "test error");
  });
    it("should append tests to existing file", async () => {
    const mockAppendFileSync = jest.spyOn(mockFs, 'appendFileSync');
    mockFs.existsSync.mockReturnValueOnce(true).mockReturnValueOnce(true);
    getChangedFiles.mockReturnValue(["testFile.js"]);
    await generateTests();
    expect(mockAppendFileSync).toHaveBeenCalled();
  });

});
```