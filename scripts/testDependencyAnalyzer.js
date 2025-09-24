import { DependencyAnalyzer, analyzeDependencies, installMissingDependencies } from "./tools/dependencyAnalyzer.js";

async function testDependencyAnalyzer() {
  console.log("🧪 Testing Dependency Analyzer System...\n");
  
  try {
    // 1. Test dependency analyzer instantiation
    console.log("1️⃣ Testing Dependency Analyzer Instantiation");
    const analyzer = new DependencyAnalyzer();
    
    console.log(`📁 Project root: ${analyzer.projectRoot}`);
    console.log(`📦 Package manager: ${analyzer.detectPackageManager()}`);
    console.log(`📋 Existing dependencies: ${analyzer.existingDependencies.size}`);
    console.log(`🔧 Existing dev dependencies: ${analyzer.existingDevDependencies.size}`);
    
    // 2. Test project analysis
    console.log("\n2️⃣ Testing Project Analysis");
    const analysis = await analyzer.analyzeProject();
    
    console.log("📊 Analysis Results:");
    console.log(`  - Files scanned: ${analysis.scannedFiles}`);
    console.log(`  - Imports detected: ${analysis.detectedImports}`);
    console.log(`  - Missing packages: ${analysis.missingPackages.length}`);
    console.log(`  - Existing packages: ${analysis.existingPackages}`);
    
    if (analysis.missingPackages.length > 0) {
      console.log("\n📥 Missing Packages Found:");
      analysis.missingPackages.forEach(pkg => {
        console.log(`  - ${pkg.name} (${pkg.type})`);
      });
    }
    
    // 3. Test comprehensive report
    console.log("\n3️⃣ Testing Comprehensive Report");
    const report = analyzer.getAnalysisReport();
    
    console.log("🔍 Detailed Report:");
    console.log(`  - Detected dependencies: ${report.detectedDependencies.length}`);
    console.log(`  - Detected dev dependencies: ${report.detectedDevDependencies.length}`);
    console.log(`  - Package manager: ${report.packageManager}`);
    
    if (report.detectedDependencies.length > 0) {
      console.log(`  - Regular deps found: ${report.detectedDependencies.slice(0, 5).join(', ')}${report.detectedDependencies.length > 5 ? '...' : ''}`);
    }
    
    if (report.detectedDevDependencies.length > 0) {
      console.log(`  - Dev deps found: ${report.detectedDevDependencies.slice(0, 5).join(', ')}${report.detectedDevDependencies.length > 5 ? '...' : ''}`);
    }
    
    // 4. Test installation (dry run first)
    console.log("\n4️⃣ Testing Package Installation");
    
    if (analysis.missingPackages.length > 0) {
      console.log(`⚠️ Would install ${analysis.missingPackages.length} packages:`);
      analysis.missingPackages.forEach(pkg => {
        const command = analyzer.detectPackageManager() === 'bun' 
          ? `bun add ${pkg.type === 'devDependency' ? '--dev ' : ''}${pkg.name}`
          : `npm install ${pkg.type === 'devDependency' ? '--save-dev ' : ''}${pkg.name}`;
        console.log(`  🔧 ${command}`);
      });
      
      // Ask if we should actually install
      console.log("\n❓ Ready to install missing packages? This will modify package.json");
      console.log("   To proceed with installation, run: await analyzer.installMissingPackages()");
      
    } else {
      console.log("✅ No missing packages to install - all dependencies satisfied!");
    }
    
    // 5. Test convenience functions
    console.log("\n5️⃣ Testing Convenience Functions");
    
    console.log("🔧 Testing analyzeDependencies()...");
    const quickAnalysis = await analyzeDependencies();
    console.log(`✅ Quick analysis: ${quickAnalysis.missingPackages.length} missing packages`);
    
    console.log("\n✅ Dependency Analyzer Test Completed Successfully!");
    console.log("\n📋 Summary:");
    console.log(`  - Project type: ${analyzer.detectPackageManager()}-based project`);
    console.log(`  - Total files scanned: ${analysis.scannedFiles}`);
    console.log(`  - Total imports analyzed: ${analysis.detectedImports}`);
    console.log(`  - Dependencies satisfied: ${analysis.existingPackages}`);
    console.log(`  - Missing packages: ${analysis.missingPackages.length}`);
    console.log(`  - System ready: ${analysis.missingPackages.length === 0 ? '✅ Yes' : '⚠️ Needs installation'}`);
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error(error.stack);
  }
}

// Run the test
testDependencyAnalyzer();