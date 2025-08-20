const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function testServerConnection() {
  console.log('🔍 Testing server connection and API endpoints...\n');
  
  try {
    // Test if server is running
    const response = await axios.get('http://localhost:3000');
    console.log('✅ Server is running');
  } catch (err) {
    console.log('❌ Server not running or not accessible:', err.message);
    console.log('🚨 Please start your server with: node app.js or npm start');
    return;
  }

  try {
    // Test registration endpoint
    const regRes = await axios.post(`${BASE_URL}/auth/register`, {
      username: 'test_debug_user',
      password: 'test1234',
      email: 'test@debug.com'
    });
    console.log('✅ Registration endpoint working:', regRes.data);
  } catch (err) {
    console.log('❌ Registration failed:', {
      status: err.response?.status,
      data: err.response?.data,
      message: err.message
    });
  }

  try {
    // Test hint endpoint (public)
    const hintRes = await axios.post(`${BASE_URL}/llm/hint/0`, {
      playerInput: 'I need help!'
    });
    console.log('✅ Hint endpoint working:', hintRes.data);
  } catch (err) {
    console.log('❌ Hint endpoint failed:', {
      status: err.response?.status,
      data: err.response?.data,
      message: err.message
    });
  }
}

testServerConnection().catch(console.error);
