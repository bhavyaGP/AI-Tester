const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/user.model');
const Level = require('../models/Level.model');
const StoreItem = require('../models/StoreItem.model');
const ShopItem = require('../models/ShopItem.model');
const InventoryItem = require('../models/InventoryItem.model');

describe('PlayPower Game Complete Flow', () => {
  let userToken;
  let userId;
  
  beforeAll(async () => {
    // Wait for database connection
    await new Promise(resolve => {
      if (mongoose.connection.readyState === 1) {
        resolve();
      } else {
        mongoose.connection.once('connected', resolve);
      }
    });

    // Clean up test data
    await User.deleteMany({ username: { $regex: /^testuser/ } });
    await Level.deleteMany({});
    await StoreItem.deleteMany({});
    await ShopItem.deleteMany({});
    await InventoryItem.deleteMany({});

    // Setup test levels (3 levels for testing)
    await Level.insertMany([
      {
        levelId: 1,
        title: "Basic Circuit",
        question: "What do you need to make a simple electric circuit work?",
        correctAnswer: "battery",
        hints: ["Think about what provides power", "It stores electrical energy"],
        explanation: "A battery provides the electrical energy needed to power a circuit."
      },
      {
        levelId: 2,
        title: "Light Reflection",
        question: "What happens when light hits a mirror?",
        correctAnswer: "reflection",
        hints: ["Light bounces back", "The angle of incidence equals the angle of..."],
        explanation: "When light hits a mirror, it reflects back at the same angle it came in."
      },
      {
        levelId: 3,
        title: "Force and Motion",
        question: "What force pulls objects toward Earth?",
        correctAnswer: "gravity",
        hints: ["It keeps you on the ground", "Newton discovered this force"],
        explanation: "Gravity is the force that attracts objects toward the center of the Earth."
      }
    ]);

    // Setup test store items
    await StoreItem.insertMany([
      {
        itemId: "multimeter",
        name: "Digital Multimeter",
        cost: 50,
        type: "tool"
      },
      {
        itemId: "battery",
        name: "AA Battery Pack",
        cost: 25,
        type: "consumable"
      }
    ]);

    // Setup test shop items
    await ShopItem.insertMany([
      {
        name: "Wire Stripper",
        description: "Essential tool for circuit work",
        price: 30,
        image: "wire-stripper.jpg"
      },
      {
        name: "LED Pack",
        description: "Assorted LEDs for experiments",
        price: 20,
        image: "led-pack.jpg"
      }
    ]);

    // Setup test inventory items
    await InventoryItem.insertMany([
      {
        itemId: "screwdriver",
        name: "Phillips Screwdriver",
        cost: 15,
        effect: "Helps with assembly tasks"
      },
      {
        itemId: "voltmeter",
        name: "Basic Voltmeter",
        cost: 40,
        effect: "Measures electrical potential"
      }
    ]);
  });

  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({ username: { $regex: /^testuser/ } });
    await Level.deleteMany({});
    await StoreItem.deleteMany({});
    await ShopItem.deleteMany({});
    await InventoryItem.deleteMany({});
    
    // Close database connection
    await mongoose.connection.close();
  });

  describe('User Registration and Authentication', () => {
    test('Register a new test user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser_game',
          password: 'testpassword123',
          email: 'testuser@game.com'
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.user.username).toBe('testuser_game');
      expect(response.body.user.level).toBe(1);
      expect(response.body.user.coins).toBe(0);
      
      userId = response.body.user._id;
    });

    test('Login with test user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser_game',
          password: 'testpassword123'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.token).toBeDefined();
      
      userToken = response.body.token;
    });

    test('Get user profile', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.user.username).toBe('testuser_game');
      expect(response.body.user.level).toBe(1);
    });
  });

  describe('Level System - Pass 3 Levels', () => {
    test('Get unlocked levels (should show level 1)', async () => {
      const response = await request(app)
        .get('/api/levels/unlocked')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].levelId).toBe(1);
      expect(response.body[0].title).toBe('Basic Circuit');
    });

    test('Get level 1 details', async () => {
      const response = await request(app)
        .get('/api/levels/1')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.levelId).toBe(1);
      expect(response.body.question).toBe('What do you need to make a simple electric circuit work?');
    });

    test('Get LLM hint for level 1', async () => {
      const response = await request(app)
        .post('/api/llm/hint/1')
        .set('Authorization', `Bearer ${userToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.hint).toBeDefined();
      console.log('Level 1 LLM Hint:', response.body.hint);
    });

    test('Submit correct answer for level 1', async () => {
      const response = await request(app)
        .post('/api/levels/1/submit')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          answer: 'battery'
        });

      expect(response.status).toBe(200);
      expect(response.body.correct).toBe(true);
      expect(response.body.message).toBe('Correct! Next level unlocked.');
    });

    test('Get level 2 details', async () => {
      const response = await request(app)
        .get('/api/levels/2')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.levelId).toBe(2);
      expect(response.body.question).toBe('What happens when light hits a mirror?');
    });

    test('Get LLM hint for level 2', async () => {
      const response = await request(app)
        .post('/api/llm/hint/2')
        .set('Authorization', `Bearer ${userToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.hint).toBeDefined();
      console.log('Level 2 LLM Hint:', response.body.hint);
    });

    test('Submit correct answer for level 2', async () => {
      const response = await request(app)
        .post('/api/levels/2/submit')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          answer: 'reflection'
        });

      expect(response.status).toBe(200);
      expect(response.body.correct).toBe(true);
      expect(response.body.message).toBe('Correct! Next level unlocked.');
    });

    test('Get level 3 details', async () => {
      const response = await request(app)
        .get('/api/levels/3')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.levelId).toBe(3);
      expect(response.body.question).toBe('What force pulls objects toward Earth?');
    });

    test('Get LLM hint for level 3', async () => {
      const response = await request(app)
        .post('/api/llm/hint/3')
        .set('Authorization', `Bearer ${userToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.hint).toBeDefined();
      console.log('Level 3 LLM Hint:', response.body.hint);
    });

    test('Submit correct answer for level 3', async () => {
      const response = await request(app)
        .post('/api/levels/3/submit')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          answer: 'gravity'
        });

      expect(response.status).toBe(200);
      expect(response.body.correct).toBe(true);
      expect(response.body.message).toBe('Correct! Next level unlocked.');
    });

    test('Verify user is now at level 4', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.user.level).toBe(4);
    });
  });

  describe('AI and LLM Features', () => {
    test('Ask general question to LLM', async () => {
      const response = await request(app)
        .post('/api/llm/ask')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          query: 'How does electricity work in simple terms?'
        });

      expect(response.status).toBe(200);
      expect(response.body.response).toBeDefined();
      console.log('LLM General Response:', response.body.response);
    });

    test('Get AI hint for a problem', async () => {
      const response = await request(app)
        .post('/api/ai/giveHint')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          taskId: 'task1',
          playerInput: 'My LED is not lighting up'
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.hint).toBeDefined();
      console.log('AI Hint Response:', response.body.hint);
    });

    test('Get AI task solution suggestion', async () => {
      const response = await request(app)
        .post('/api/ai/solveTask')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          taskId: 'task1',
          problem: 'LED not working in circuit',
          playerInput: 'I connected everything but the LED won\'t light up'
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.suggestion).toBeDefined();
      console.log('AI Solution Suggestion:', response.body.suggestion);
    });

    test('Get explanation for completed level', async () => {
      const response = await request(app)
        .post('/api/llm/explanation/1')
        .set('Authorization', `Bearer ${userToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.explanation).toBeDefined();
      console.log('Level 1 Explanation:', response.body.explanation);
    });
  });

  describe('Inventory System', () => {
    test('Get player inventory', async () => {
      const response = await request(app)
        .get('/api/inventory')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('Buy item from store', async () => {
      // First, give user some coins
      await User.findByIdAndUpdate(userId, { coins: 100 });

      const response = await request(app)
        .post('/api/inventory/buy')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          itemId: 'multimeter'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Item bought');
      expect(response.body.inventory).toBeDefined();
    });
  });

  describe('Shop System', () => {
    test('List shop items', async () => {
      const response = await request(app)
        .get('/api/shop')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    test('Buy shop item', async () => {
      // Get a shop item ID first
      const shopResponse = await request(app)
        .get('/api/shop')
        .set('Authorization', `Bearer ${userToken}`);

      const shopItemId = shopResponse.body[0]._id;

      const response = await request(app)
        .post('/api/shop/buy')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          itemId: shopItemId
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Item bought successfully');
    });
  });

  describe('Store System', () => {
    test('Get store items', async () => {
      const response = await request(app)
        .get('/api/store')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Game Statistics', () => {
    test('Get player stats', async () => {
      const response = await request(app)
        .get('/api/stats/player')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.body.submissions).toBeDefined();
      expect(response.body.user.level).toBe(4);
    });

    test('Get leaderboard', async () => {
      const response = await request(app)
        .get('/api/stats/leaderboard')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Task System', () => {
    test('Get tasks for level', async () => {
      const response = await request(app)
        .get('/api/tasks/1')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('Submit wrong answer', async () => {
      const response = await request(app)
        .post('/api/levels/1/submit')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          answer: 'wrong_answer'
        });

      expect(response.status).toBe(200);
      expect(response.body.correct).toBe(false);
      expect(response.body.message).toBe('Incorrect. Try again or ask Raju for help.');
    });

    test('Access level without token', async () => {
      const response = await request(app)
        .get('/api/levels/1');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('No token provided');
    });

    test('Get non-existent level', async () => {
      const response = await request(app)
        .get('/api/levels/999')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Level not found');
    });
  });

  describe('Authentication Edge Cases', () => {
    test('Logout user', async () => {
      const response = await request(app)
        .get('/api/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Logout successful');
    });

    test('Try to register with existing username', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser_game',
          password: 'newpassword',
          email: 'newemail@test.com'
        });

      expect(response.status).toBe(409);
      expect(response.body.message).toBe('Username already exists');
    });

    test('Login with wrong credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser_game',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid username or password');
    });
  });
});
