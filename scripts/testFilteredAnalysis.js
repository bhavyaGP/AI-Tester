import { analyzeProjectStructure } from "./tools/projectAnalyzer.js";

async function testProjectAnalysis() {
  console.log("🧪 Testing Updated Project Structure Analysis...\n");
  
  try {
    const projectAnalyzer = analyzeProjectStructure();
    
    console.log("📊 Project Analysis Results:");
    console.log(`  - Project type: ${projectAnalyzer.structure.type}`);
    console.log(`  - Package type: ${projectAnalyzer.structure.packageType}`);
    console.log(`  - Test directory: ${projectAnalyzer.structure.testDir}`);
    
    console.log("\n📁 Source directories detected:");
    if (projectAnalyzer.structure.srcDirs.length === 0) {
      console.log("  ❌ No source directories found");
    } else {
      projectAnalyzer.structure.srcDirs.forEach((dir, index) => {
        console.log(`  ${index + 1}. ${dir}`);
      });
    }
    
    console.log("\n🎯 Directory patterns:");
    console.log(`  - Controllers: ${projectAnalyzer.structure.patterns.controllers.length}`);
    console.log(`  - Models: ${projectAnalyzer.structure.patterns.models.length}`);
    console.log(`  - Services: ${projectAnalyzer.structure.patterns.services.length}`);
    console.log(`  - Utils: ${projectAnalyzer.structure.patterns.utils.length}`);
    console.log(`  - Config: ${projectAnalyzer.structure.patterns.config.length}`);
    
    console.log("\n📋 Expected test directories to be created:");
    const testDir = projectAnalyzer.structure.testDir;
    projectAnalyzer.structure.srcDirs.forEach(srcDir => {
      console.log(`  - ${testDir}/${srcDir}`);
    });
    
    console.log("\n✅ Analysis completed successfully!");
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error(error.stack);
  }
}

testProjectAnalysis();