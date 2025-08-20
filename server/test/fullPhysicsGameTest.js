const axios = require('axios');
const mongoose = require('mongoose');
const Level = require('../models/Level.model');
const User = require('../models/user.model');

const BASE_URL = 'http://localhost:3000/api';

async function runFullTest() {
  let token;
  let userId;
  let testResults = [];
  const uniqueId = Date.now();

  console.log('🧪 Starting comprehensive physics game test as an 8-year-old learner...\n');

  // Register user (needs email as per auth controller)
  try {
    const regRes = await axios.post(`${BASE_URL}/auth/register`, {
      username: `physics_kid_${uniqueId}`, // Use timestamp to make unique
      password: 'test1234',
      email: `physics_kid_${uniqueId}@test.com`
    });
    userId = regRes.data.user?._id;
    testResults.push({ step: 'register', success: true, data: regRes.data });
    console.log('✅ User registered successfully!');
  } catch (err) {
    testResults.push({ step: 'register', success: false, error: err.response?.data || err.message });
    console.log('❌ Registration failed:', err.response?.data || err.message);
    return printResults(testResults);
  }

  // Login to get token
  try {
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      username: `physics_kid_${uniqueId}`,
      password: 'test1234'
    });
    token = loginRes.data.token;
    userId = loginRes.data.user._id;
    testResults.push({ step: 'login', success: true, data: loginRes.data });
    console.log('✅ Login successful!');
  } catch (err) {
    testResults.push({ step: 'login', success: false, error: err.response?.data || err.message });
    console.log('❌ Login failed:', err.response?.data || err.message);
    return printResults(testResults);
  }

  // Try login if token not present
  if (!token) {
    try {
      const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
        username: 'physics_kid_8yo',
        password: 'test1234'
      });
      token = loginRes.data.token || loginRes.data.accessToken;
      userId = loginRes.data.user?._id || loginRes.data.userId;
      testResults.push({ step: 'login', success: true, data: loginRes.data });
    } catch (err) {
      testResults.push({ step: 'login', success: false, error: err.response?.data || err.message });
      return printResults(testResults);
    }
  }

  // Get all levels from DB to verify they were inserted
  let levels;
  try {
    await mongoose.connect('mongodb://localhost:27017/playpower');
    levels = await Level.find({}).sort({ levelId: 1 });
    testResults.push({ step: 'fetch_levels', success: true, count: levels.length });
    console.log(`✅ Found ${levels.length} levels in database`);
  } catch (err) {
    testResults.push({ step: 'fetch_levels', success: false, error: err.message });
    console.log('❌ Failed to fetch levels from DB:', err.message);
    return printResults(testResults);
  }

  // Verify user starts at level 0/1
  try {
    const user = await User.findById(userId);
    console.log(`👶 Starting user level: ${user.level}, coins: ${user.coins}`);
    testResults.push({ step: 'check_initial_user', success: true, level: user.level, coins: user.coins });
  } catch (err) {
    testResults.push({ step: 'check_initial_user', success: false, error: err.message });
  }

  console.log('\n🎮 Starting game progression through all levels...\n');

  // For each level, simulate an 8-year-old playing
  for (const level of levels) {
    const levelId = level.levelId;
    console.log(`\n📚 Level ${levelId}: ${level.title}`);
    console.log(`❓ Question: ${level.question}`);

    // Step 1: Get hint (public endpoint, no auth needed)
    try {
      const hintRes = await axios.post(`${BASE_URL}/llm/hint/${levelId}`, { 
        playerInput: 'I need help with this question! Can you give me a hint?' 
      });
      testResults.push({ step: `hint_${levelId}`, success: true, hint: hintRes.data.hint });
      console.log(`💡 Hint received: ${hintRes.data.hint?.substring(0, 100)}...`);
    } catch (err) {
      testResults.push({ step: `hint_${levelId}`, success: false, error: err.response?.data || err.message });
      console.log(`❌ Hint failed for level ${levelId}:`, err.response?.data || err.message);
    }

    // Step 2: Submit correct answer using level controller
    try {
      const submitRes = await axios.post(`${BASE_URL}/levels/${levelId}/submit`, {
        answer: level.correctAnswer
      }, { headers: { Authorization: `Bearer ${token}` } });
      testResults.push({ step: `submit_${levelId}`, success: true, result: submitRes.data });
      console.log(`✅ Answer submitted: ${submitRes.data.message}`);
    } catch (err) {
      testResults.push({ step: `submit_${levelId}`, success: false, error: err.response?.data || err.message });
      console.log(`❌ Submit failed for level ${levelId}:`, err.response?.data || err.message);
    }

    // Step 3: Get explanation after completing level
    try {
      const expRes = await axios.post(`${BASE_URL}/llm/explanation/${levelId}`, {}, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      testResults.push({ step: `explanation_${levelId}`, success: true, explanation: expRes.data.explanation });
      console.log(`📖 Explanation: ${expRes.data.explanation?.substring(0, 100)}...`);
    } catch (err) {
      testResults.push({ step: `explanation_${levelId}`, success: false, error: err.response?.data || err.message });
      console.log(`❌ Explanation failed for level ${levelId}:`, err.response?.data || err.message);
    }

    // Check user progress after each level
    try {
      const user = await User.findById(userId);
      console.log(`👤 User progress: Level ${user.level}, Coins: ${user.coins}`);
      testResults.push({ step: `progress_check_${levelId}`, success: true, userLevel: user.level, coins: user.coins });
    } catch (err) {
      testResults.push({ step: `progress_check_${levelId}`, success: false, error: err.message });
    }
  }

  console.log('\n🧪 Testing edge cases...\n');

  // Edge case 1: Invalid token
  try {
    await axios.post(`${BASE_URL}/llm/explanation/0`, {}, { headers: { Authorization: `Bearer invalidtoken123` } });
    testResults.push({ step: 'invalid_token', success: false, error: 'Should have failed but succeeded' });
  } catch (err) {
    testResults.push({ step: 'invalid_token', success: true, error: err.response?.data || err.message });
    console.log('✅ Invalid token correctly rejected');
  }

  // Edge case 2: Invalid level ID
  try {
    await axios.post(`${BASE_URL}/llm/hint/999`, { playerInput: 'help' });
    testResults.push({ step: 'invalid_level_hint', success: false, error: 'Should have failed but succeeded' });
  } catch (err) {
    testResults.push({ step: 'invalid_level_hint', success: true, error: err.response?.data || err.message });
    console.log('✅ Invalid level correctly rejected');
  }

  // Edge case 3: Wrong answer submission
  try {
    const wrongRes = await axios.post(`${BASE_URL}/levels/0/submit`, {
      answer: 'wrong answer'
    }, { headers: { Authorization: `Bearer ${token}` } });
    testResults.push({ step: 'wrong_answer', success: true, result: wrongRes.data });
    console.log('✅ Wrong answer handling:', wrongRes.data.message);
  } catch (err) {
    testResults.push({ step: 'wrong_answer', success: false, error: err.response?.data || err.message });
  }

  // Final user check
  try {
    const finalUser = await User.findById(userId);
    console.log(`\n🏆 Final user stats: Level ${finalUser.level}, Coins: ${finalUser.coins}`);
    testResults.push({ step: 'final_user_check', success: true, finalLevel: finalUser.level, finalCoins: finalUser.coins });
  } catch (err) {
    testResults.push({ step: 'final_user_check', success: false, error: err.message });
  }

  printResults(testResults);
  mongoose.connection.close();
}

function printResults(results) {
  console.log('\n--- 🎯 FULL PHYSICS GAME TEST RESULTS (8-Year-Old Learner) ---');
  
  let successCount = 0;
  let totalCount = results.length;
  
  for (const r of results) {
    if (r.success) {
      successCount++;
      console.log(`✔️  ${r.step}:`, r.hint || r.explanation || r.result || r.data?.message || r.count || r.userLevel || r.finalLevel || 'Success');
    } else {
      console.log(`❌ ${r.step}:`, r.error);
    }
  }
  
  console.log(`\n📊 Test Summary: ${successCount}/${totalCount} tests passed (${((successCount/totalCount)*100).toFixed(1)}%)`);
  console.log('🎮 Game simulation complete!\n');
}

runFullTest().catch(console.error);
