import { StateGraph } from "@langchain/langgraph";
import { mainAgent } from "./agent/mainAgent.js";
import { setupProduction, validateProduction } from "./tools/productionSetup.js";
import { analyzeProjectStructure } from "./tools/projectAnalyzer.js";

async function testProductionSetup() {
  console.log("🧪 Testing Production Setup System...\n");
  
  try {
    // Test project structure analysis
    console.log("1️⃣ Testing Project Structure Analysis");
    const projectAnalyzer = analyzeProjectStructure();
    console.log("📊 Project Analysis Result:");
    console.log(JSON.stringify(projectAnalyzer.structure, null, 2));
    
    // Test import path generation
    console.log("\n2️⃣ Testing Import Path Generation");
    const testFile = "server/controller/admin.controller.js";
    const testPath = projectAnalyzer.getTestFilePath(testFile);
    const imports = projectAnalyzer.generateImportStatements(testPath, testFile);
    
    console.log(`📁 Source: ${testFile}`);
    console.log(`🧪 Test file: ${testPath}`);
    console.log(`📦 Generated imports:`);
    imports.forEach(imp => console.log(`  ${imp}`));
    
    // Test production validation
    console.log("\n3️⃣ Testing Production Validation");
    const validation = await validateProduction();
    console.log("✅ Validation Result:", validation);
    
    // If needed, run full setup
    if (!validation.valid) {
      console.log("\n4️⃣ Running Full Production Setup");
      const setupResult = await setupProduction();
      console.log("🔧 Setup Result:", setupResult);
    }
    
    // Test actual generation with a real file
    console.log("\n5️⃣ Testing Enhanced AI Agent");
    const testTargetFile = "server/controller/admin.controller.js";
    
    // Use dynamic import for fs
    const fs = await import('fs');
    
    if (fs.default.existsSync(testTargetFile)) {
      console.log(`🎯 Generating test for: ${testTargetFile}`);
      const result = await mainAgent(testTargetFile);
      console.log(`✅ Test generated: ${result}`);
    } else {
      console.log(`⚠️ Test target file not found: ${testTargetFile}`);
      
      // List available files to test
      const path = await import('path');
      
      console.log("\n📁 Available files in server/controller/:");
      try {
        const files = fs.default.readdirSync('server/controller/');
        files.filter(f => f.endsWith('.js')).forEach(f => {
          console.log(`  - server/controller/${f}`);
        });
      } catch (error) {
        console.log("❌ Could not list server/controller/ directory");
      }
    }
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error(error.stack);
  }
}

// Run the test
testProductionSetup();