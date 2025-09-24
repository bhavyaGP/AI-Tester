import { DependencyAnalyzer } from "./tools/dependencyAnalyzer.js";

async function testInstallation() {
  console.log("🧪 Testing Automatic Package Installation...\n");
  
  try {
    const analyzer = new DependencyAnalyzer();
    
    // Analyze current state
    console.log("1️⃣ Analyzing current dependencies...");
    const analysis = await analyzer.analyzeProject();
    
    console.log(`📊 Found ${analysis.missingPackages.length} missing packages`);
    
    if (analysis.missingPackages.length > 0) {
      console.log("\n📥 Missing packages to install:");
      analysis.missingPackages.forEach(pkg => {
        console.log(`  - ${pkg.name} (${pkg.type})`);
      });
      
      console.log("\n2️⃣ Starting automatic installation...");
      const installSuccess = await analyzer.installMissingPackages();
      
      if (installSuccess) {
        console.log("\n✅ Installation completed successfully!");
        
        // Verify installation
        console.log("\n3️⃣ Verifying installation...");
        const newAnalysis = await analyzer.analyzeProject();
        
        console.log(`📊 Missing packages after installation: ${newAnalysis.missingPackages.length}`);
        
        if (newAnalysis.missingPackages.length === 0) {
          console.log("🎉 All dependencies now satisfied!");
        } else {
          console.log("⚠️ Some packages still missing:");
          newAnalysis.missingPackages.forEach(pkg => {
            console.log(`  - ${pkg.name} (${pkg.type})`);
          });
        }
      } else {
        console.log("❌ Installation failed");
      }
    } else {
      console.log("✅ No missing packages - all dependencies already satisfied!");
    }
    
  } catch (error) {
    console.error("❌ Installation test failed:", error.message);
    console.error(error.stack);
  }
}

// Run the test
testInstallation();