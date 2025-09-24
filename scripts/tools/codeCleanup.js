/**
 * Clean generated code from LLM responses
 * Removes markdown code blocks and other formatting artifacts
 */

export function cleanGeneratedCode(generatedText) {
  if (!generatedText || typeof generatedText !== 'string') {
    return '';
  }

  let cleaned = generatedText.trim();

  // Remove markdown code blocks (```javascript, ```js, ```)
  cleaned = cleaned.replace(/^```(?:javascript|js|jsx|ts|tsx)?\s*\n/i, '');
  cleaned = cleaned.replace(/\n```\s*$/i, '');
  
  // Remove any remaining triple backticks at start or end
  cleaned = cleaned.replace(/^```\s*/, '');
  cleaned = cleaned.replace(/\s*```$/, '');
  
  // Remove any trailing markdown blocks and text after them
  cleaned = cleaned.replace(/\n```[\s\S]*$/i, '');
  
  // Remove any HTML-style comments that might wrap the code
  cleaned = cleaned.replace(/^<!--[\s\S]*?-->\s*/i, '');
  cleaned = cleaned.replace(/\s*<!--[\s\S]*?-->$/i, '');
  
  // Remove any explanatory text before the actual code
  // Look for common patterns like "Here's the test code:" or "The test file should be:"
  const codeStartPatterns = [
    /^.*?(?:here'?s?\s+(?:the\s+)?(?:test\s+)?code:?\s*\n)/i,
    /^.*?(?:the\s+test\s+file\s+should\s+be:?\s*\n)/i,
    /^.*?(?:test\s+code:?\s*\n)/i,
    /^.*?(?:jest\s+test:?\s*\n)/i,
    /^.*?(?:unit\s+test:?\s*\n)/i
  ];
  
  for (const pattern of codeStartPatterns) {
    if (pattern.test(cleaned)) {
      cleaned = cleaned.replace(pattern, '');
      break; // Only apply the first matching pattern
    }
  }
  
  // Remove any explanatory text after the code
  // Look for patterns like "This test..." at the end
  const codeEndPatterns = [
    /\n\n.*?(?:this\s+test|the\s+above|explanation|note:)[\s\S]*$/i
  ];
  
  for (const pattern of codeEndPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Ensure the code starts with valid JavaScript
  // If it doesn't start with common JS patterns, try to find where the actual code begins
  const jsStartPatterns = [
    /^(const|let|var|import|require|jest|describe|test|it|beforeEach|afterEach|function)/,
    /^\/\*[\s\S]*?\*\/\s*(const|let|var|import|require|jest|describe)/,
    /^\/\/.*\n\s*(const|let|var|import|require|jest|describe)/
  ];
  
  let foundValidStart = false;
  for (const pattern of jsStartPatterns) {
    if (pattern.test(cleaned)) {
      foundValidStart = true;
      break;
    }
  }
  
  // If no valid start found, try to extract code between common delimiters
  if (!foundValidStart) {
    const lines = cleaned.split('\n');
    let startIndex = -1;
    let endIndex = lines.length;
    
    // Find the first line that looks like JavaScript code
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line && (
        line.startsWith('const ') ||
        line.startsWith('let ') ||
        line.startsWith('var ') ||
        line.startsWith('import ') ||
        line.startsWith('require(') ||
        line.startsWith('jest.') ||
        line.startsWith('describe(') ||
        line.startsWith('test(') ||
        line.startsWith('it(') ||
        line.startsWith('//') ||
        line.startsWith('/*')
      )) {
        startIndex = i;
        break;
      }
    }
    
    if (startIndex >= 0) {
      cleaned = lines.slice(startIndex, endIndex).join('\n');
    }
  }
  
  // Final cleanup
  cleaned = cleaned.trim();
  
  // Ensure proper formatting
  if (cleaned && !cleaned.endsWith('\n')) {
    cleaned += '\n';
  }
  
  return cleaned;
}

export function validateGeneratedCode(code) {
  const issues = [];
  
  // Check for markdown artifacts
  if (code.includes('```')) {
    issues.push('Contains markdown code blocks');
  }
  
  // Check for common LLM explanatory text
  const explanatoryPatterns = [
    /here'?s\s+(?:the\s+)?(?:test\s+)?code/i,
    /this\s+test\s+(?:will|should|checks?)/i,
    /the\s+above\s+test/i,
    /explanation:/i
  ];
  
  for (const pattern of explanatoryPatterns) {
    if (pattern.test(code)) {
      issues.push('Contains explanatory text that should be removed');
      break;
    }
  }
  
  // Check if it starts with valid JavaScript
  const validStart = /^(const|let|var|import|require|jest|describe|test|it|beforeEach|afterEach|function|\/\*|\/\/)/;
  if (!validStart.test(code.trim())) {
    issues.push('Does not start with valid JavaScript syntax');
  }
  
  return issues;
}