const axios = require('axios');
const mongoose = require('mongoose');
const User = require('../models/user.model'); // Assuming user model exists

const BASE_URL = 'http://localhost:3000/api'; // Update with your server's base URL

const testGameProgression = async () => {
  try {
    // Step 1: Register a new user
    const registerResponse = await axios.post(`${BASE_URL}/auth/register`, {
      username: 'testUser',
      password: 'testPassword',
    });
    console.log('User registered:', registerResponse.data);

    const token = registerResponse.data.token; // Assuming token is returned

    // Step 2: Start the game from level 0
    for (let levelId = 0; levelId < 10; levelId++) {
      try {
        // Fetch hint for the level
        const hintResponse = await axios.post(
          `${BASE_URL}/llm/hint/${levelId}`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log(`Hint for level ${levelId}:`, hintResponse.data);

        // Submit correct answer for the level
        const answerResponse = await axios.post(
          `${BASE_URL}/game/submit`,
          { levelId, answer: 'correctAnswer' }, // Replace 'correctAnswer' with actual logic if needed
          { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log(`Level ${levelId} submission:`, answerResponse.data);

        // Fetch explanation for the level
        const explanationResponse = await axios.post(
          `${BASE_URL}/llm/explanation/${levelId}`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log(`Explanation for level ${levelId}:`, explanationResponse.data);
      } catch (levelError) {
        console.error(`Error during level ${levelId} operations:`, {
          message: levelError.message,
          response: levelError.response?.data,
          status: levelError.response?.status,
        });
      }
    }

    console.log('Game progression test completed successfully!');
  } catch (error) {
    console.error('Error during game progression test:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
  }
};

testGameProgression();
