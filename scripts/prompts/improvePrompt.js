export default function improvePromptTemplate(fileContent, relativeImport, errorLogs) {
  return `
You are an expert JavaScript testing assistant.
Previous tests did not reach 80% coverage.

File Path Import: ${relativeImport}

=== CODE START ===
${fileContent}
=== CODE END ===

Error logs & uncovered branches:
${errorLogs}

Your task:
- Improve the tests to fix coverage gaps.
- Cover missing branches, error handling, and edge cases.
- Output only valid Jest test code.
- Do NOT fabricate behavior. Mock dependencies instead of assuming library error messages.
- Do NOT include '''javascript or '''python or any other delimiters, just provide the code directly.
`;
}
