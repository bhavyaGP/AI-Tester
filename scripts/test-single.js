import fs from "fs";
import path from "path";
import { mainAgent } from "./agent/mainAgent.js";

// Simple test of the mainAgent for a single file
async function testSingleFile() {
  const testFile = "server/config/feature.config.js";
  console.log(`🧪 Testing single file: ${testFile}`);
  
  try {
    await mainAgent(testFile);
    console.log(`✅ Successfully generated test for ${testFile}`);
  } catch (error) {
    console.error(`❌ Error generating test for ${testFile}:`, error);
  }
}

testSingleFile();