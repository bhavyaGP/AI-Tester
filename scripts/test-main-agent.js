import fs from "fs";
import { mainAgent } from "./agent/mainAgent.js";

// Test the main agent with the cleanup function
async function testMainAgent() {
  const testFile = "server/config/feature.config.js";
  console.log(`🧪 Testing main agent with cleanup for: ${testFile}`);
  
  try {
    const result = await mainAgent(testFile);
    console.log(`✅ Successfully generated test file: ${result}`);
    
    // Read the generated file to check if it's clean
    const generatedContent = fs.readFileSync(result, "utf8");
    
    console.log("\n📋 Generated content preview (first 300 chars):");
    console.log(generatedContent.substring(0, 300) + "...");
    
    // Check for markdown artifacts
    if (generatedContent.includes("```")) {
      console.log("❌ WARNING: Generated code still contains markdown blocks!");
    } else {
      console.log("✅ Generated code is clean of markdown blocks");
    }
    
  } catch (error) {
    console.error(`❌ Error in test:`, error.message);
  }
}

testMainAgent();