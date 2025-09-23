import fs from 'fs';
import path from 'path';


export function parseEnvFile(content) {
  const envVars = {};
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    // Skip empty lines and comments
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }
    
    // Match KEY=VALUE or KEY="VALUE" or KEY='VALUE'
    const match = trimmedLine.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (match) {
      let [, key, value] = match;
      
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      envVars[key] = value;
    }
  }
  
  return envVars;
}

/**
 * Load environment variables from .env.example file (NEVER reads .env files for security)
 * This function ONLY reads .env.example or .env.sample files to identify variable names
 * and provides test-safe values. It never exposes real API keys or sensitive data.
 * @param {string} workspaceRoot - Root directory of the workspace
 * @param {boolean} forTesting - If true, returns test-specific values
 * @returns {Object} - Environment variables with test-safe values
 */
export function loadEnvExample(workspaceRoot = '', forTesting = true) {
  const testEnvVars = {
    NODE_ENV: 'test',
    PORT: '3001',
    SOCKET_PORT: '5002',
    MONGODB_URI: 'mongodb://localhost:27017/testdb',
    JWT_SECRET: 'test-jwt-secret-key-for-testing',
    FRONTEND_URL: 'http://localhost:5173',
    SERVER_URL_1: 'http://localhost:3001',
    AI_API_URL: 'http://localhost:5001/api',
    INTERNAL_API_KEY: 'test-internal-api-key',
    GROQ_API_KEY: 'test-groq-api-key',
    GEMINI_API_KEY: 'test-gemini-api-key',
    GOOGLE_CLIENT_ID: 'test-google-client-id',
    GOOGLE_CLIENT_SECRET: 'test-google-client-secret',
    BROVO_API_KEY: 'test-brovo-api-key',
    mongoUrl: 'mongodb://localhost:27017/testdb'
  };

  try {
    // Try to find .env.example file
    const possiblePaths = [
      path.join(workspaceRoot, '.env.example'),
      path.join(workspaceRoot, 'server', '.env.example'),
      path.join(workspaceRoot, '.env.sample'),
      path.join(workspaceRoot, 'server', '.env.sample')
    ];

    for (const envPath of possiblePaths) {
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        if (content.trim()) {
          const parsedVars = parseEnvFile(content);
          
          if (forTesting) {
            // For testing, use test-specific values but keep the structure from .env.example
            const testValues = { ...testEnvVars };
            // Override with any specific values from .env.example that might be test-relevant
            Object.keys(parsedVars).forEach(key => {
              if (key in testValues) {
                // Keep test values for critical testing variables
                if (!['NODE_ENV', 'MONGODB_URI', 'JWT_SECRET', 'mongoUrl'].includes(key)) {
                  testValues[key] = parsedVars[key];
                }
              } else {
                // Add any new variables from .env.example
                testValues[key] = parsedVars[key];
              }
            });
            return testValues;
          } else {
            // For non-testing use, merge with defaults
            return { ...testEnvVars, ...parsedVars };
          }
        }
      }
    }

    console.log('📝 No .env.example file found or file is empty, using default test environment variables');
    return testEnvVars;
  } catch (error) {
    console.warn(`⚠️ Error reading .env.example file: ${error.message}`);
    return testEnvVars;
  }
}