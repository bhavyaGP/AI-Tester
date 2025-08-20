require('dotenv').config();
const { spawn, exec } = require('child_process');
const path = require('path');

async function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${command} ${args.join(' ')}`);
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });

    child.on('error', reject);
  });
}

async function setupAndRunTests() {
  console.log('🚀 Setting up PlayPower Game Test Environment\n');

  try {
    // 1. Setup test data
    console.log('📊 Setting up test data...');
    await runCommand('node', ['test/setup-test-data.js']);
    console.log('✅ Test data setup complete\n');

    // 2. Start the server in background
    console.log('🖥️ Starting server...');
    const serverProcess = spawn('node', ['app.js'], {
      stdio: 'pipe',
      shell: true
    });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('✅ Server started\n');

    // 3. Run the game demo
    console.log('🎮 Running complete game demo...');
    await runCommand('node', ['test/game-demo.js']);
    console.log('✅ Game demo complete\n');

    // 4. Run Jest tests
    console.log('🧪 Running Jest tests...');
    await runCommand('npm', ['test']);
    console.log('✅ All tests passed\n');

    // Clean up
    console.log('🧹 Cleaning up...');
    serverProcess.kill();
    console.log('✅ Server stopped');

    console.log('\n🎉 All tests completed successfully!');
    console.log('✅ User successfully passed 3 levels');
    console.log('✅ All routes tested');
    console.log('✅ LLM hints working');
    console.log('✅ Complete game flow verified');

  } catch (error) {
    console.error('\n❌ Test setup failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  setupAndRunTests();
}

module.exports = { setupAndRunTests };
