# PlayPower Game Testing Suite

This comprehensive testing suite tests all routes, simulates a user passing 3 levels, and includes LLM hints functionality.

## Quick Start

### Option 1: Run Complete Test Suite
```bash
npm run test:all
```

This will:
1. Setup test data (3 levels + shop items)
2. Start the server
3. Run a complete game demo
4. Run Jest unit tests
5. Clean up

### Option 2: Step by Step

1. **Setup test data first:**
```bash
npm run test:setup
```

2. **Start the server in one terminal:**
```bash
npm start
```

3. **Run the game demo in another terminal:**
```bash
npm run test:demo
```

4. **Run Jest tests:**
```bash
npm test
```

## What Gets Tested

### 🎮 Game Flow
- User registration and authentication
- Passing 3 levels with correct answers
- Wrong answer handling
- Level progression

### 🤖 AI/LLM Features
- LLM hints for each level
- General LLM questions
- AI problem-solving hints
- Level explanations

### 🛍️ Shop & Inventory
- Viewing shop items
- Buying items
- Inventory management
- Store items

### 📊 Statistics
- Player stats
- Leaderboard
- Game progression tracking

### 🔐 Authentication & Security
- User registration
- Login/logout
- Token validation
- Protected routes

## Test Data Structure

### Levels (3 test levels):
1. **Basic Circuit** - Answer: "battery"
2. **Light Reflection** - Answer: "reflection"  
3. **Force and Motion** - Answer: "gravity"

### Test User Data:
```json
{
  "username": "testuser_game",
  "password": "testpassword123",
  "email": "testuser@game.com"
}
```

## API Endpoints Tested

### Authentication Routes
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get user profile

### Level Routes
- `GET /api/levels/unlocked` - Get unlocked levels
- `GET /api/levels/:levelId` - Get level details
- `POST /api/levels/:levelId/submit` - Submit level answer
- `POST /api/levels/:levelId/unlock` - Unlock next level

### LLM/AI Routes
- `POST /api/llm/ask` - Ask general question
- `POST /api/llm/hint/:levelId` - Get hint for level
- `POST /api/llm/explanation/:levelId` - Get level explanation
- `POST /api/ai/giveHint` - Get AI hint
- `POST /api/ai/solveTask` - Get AI solution suggestion

### Shop & Inventory Routes
- `GET /api/shop` - List shop items
- `POST /api/shop/buy` - Buy shop item
- `GET /api/store` - Get store items
- `GET /api/inventory` - Get player inventory
- `POST /api/inventory/buy` - Buy inventory item

### Statistics Routes
- `GET /api/stats/player` - Get player statistics
- `GET /api/stats/leaderboard` - Get leaderboard

### Task Routes
- `GET /api/tasks/:level` - Get tasks for level
- `POST /api/tasks/submit` - Submit task answer

## Demo Flow

The `game-demo.js` script simulates a complete player journey:

1. 🎮 **Player Registration** - Creates new test user
2. 🔑 **Login** - Authenticates user and gets token
3. 👤 **Profile Check** - Views initial player state
4. 📚 **Level Discovery** - Sees available levels
5. 🤖 **LLM Interaction** - Asks general physics question
6. 🧠 **AI Assistance** - Gets help with circuit problem
7. 🎯 **Level 1** - Basic Circuit (Answer: battery)
   - Gets level details
   - Requests LLM hint
   - Tries wrong answer first
   - Submits correct answer
   - Gets explanation
8. 🎯 **Level 2** - Light Reflection (Answer: reflection)
9. 🎯 **Level 3** - Force and Motion (Answer: gravity)
10. 📊 **Final Stats** - Views progression and achievements
11. 🏆 **Leaderboard** - Sees ranking among players

## Expected Output

```
🎮 Starting Complete PlayPower Game Demo

✅ Player registered: testplayer_1234567890
✅ Login successful
✅ Player: testplayer_1234567890, Level: 1, Coins: 0
✅ Unlocked levels: 1
   - Level 1: Basic Circuit
✅ LLM Response: Electric circuits work by...
✅ AI Hint: Check if your LED is connected properly...

🎯 Playing Level 1...
✅ Level 1: Basic Circuit
   Question: What do you need to make a simple electric circuit work?
✅ LLM Hint: To make a simple electric circuit work...
❌ Incorrect. Try again or ask Raju for help.
✅ Correct! Next level unlocked.
✅ Explanation: A battery provides the electrical energy...

[Similar output for Levels 2 and 3]

✅ Player: testplayer_1234567890, Level: 4, Coins: 0
🎉 Complete game demo finished successfully!
✅ Player passed 3 levels and tested all major features
```

## Troubleshooting

### MongoDB Connection Issues
Make sure MongoDB is running on `mongodb://localhost:27017/playpower`

### LLM/AI API Issues
If Gemini API calls fail, tests will continue with mock responses. Check your `GEMINI_API_KEY` in `.env`.

### Port Issues
Ensure port 3000 is available or change the port in `.env`.

### Jest Timeout Issues
Tests have a 30-second timeout. Increase in `jest.config.json` if needed.

## Environment Variables Required

```bash
mongoUrl="mongodb://localhost:27017/playpower"
port=3000
JWT_SECRET="keyboardcat"
GEMINI_API_KEY="your_gemini_api_key_here"
```

## Files Created

- `test/complete-game-test.js` - Comprehensive Jest test suite
- `test/game-demo.js` - Interactive game demo script
- `test/setup-test-data.js` - Test data setup script
- `test/run-all-tests.js` - Master test runner
- `test/setup.js` - Jest configuration
- `jest.config.json` - Jest settings

Run any of these scripts individually or use the npm commands for a complete testing experience!
