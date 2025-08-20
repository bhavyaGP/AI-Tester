require('dotenv').config();
const mongoose = require('mongoose');
const Level = require('../models/Level.model');
const StoreItem = require('../models/StoreItem.model');
const ShopItem = require('../models/ShopItem.model');
const InventoryItem = require('../models/InventoryItem.model');

async function setupTestData() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.mongoUrl, {
      serverSelectionTimeoutMS: 30000,
    });
    console.log('Connected to database');

    // Clear existing test data
    console.log('Clearing existing test data...');
    await Level.deleteMany({});
    await StoreItem.deleteMany({});
    await ShopItem.deleteMany({});
    await InventoryItem.deleteMany({});

    // Setup test levels (3 levels for testing)
    console.log('Creating test levels...');
    await Level.insertMany([
      {
        levelId: 1,
        title: "Basic Circuit",
        question: "What do you need to make a simple electric circuit work?",
        correctAnswer: "battery",
        hints: ["Think about what provides power", "It stores electrical energy"],
        explanation: "A battery provides the electrical energy needed to power a circuit.",
        reward: levelId => levelId * 10 
      },
      {
        levelId: 2,
        title: "Light Reflection",
        question: "What happens when light hits a mirror?",
        correctAnswer: "reflection",
        hints: ["Light bounces back", "The angle of incidence equals the angle of..."],
        explanation: "When light hits a mirror, it reflects back at the same angle it came in.",
        reward: levelId => levelId * 10 

      },
      {
        levelId: 3,
        title: "Force and Motion",
        question: "What force pulls objects toward Earth?",
        correctAnswer: "gravity",
        hints: ["It keeps you on the ground", "Newton discovered this force"],
        explanation: "Gravity is the force that attracts objects toward the center of the Earth.",
        reward: levelId => levelId * 10 
      },
      {
        levelId: 4,
        title: "Sound Waves",
        question: "How does sound travel through air?",
        correctAnswer: "vibrations",
        hints: ["Think about how waves move", "Sound makes particles move back and forth"],
        explanation: "Sound travels through air as vibrations that move in waves.",
        reward: levelId => levelId * 10 
      },
      {
        levelId: 5,
        title: "Heat Transfer",
        question: "What happens when you touch something hot?",
        correctAnswer: "conduction",
        hints: ["Heat moves from hot to cold", "Direct contact transfers heat"],
        explanation: "Heat transfers through direct contact, which is called conduction.",
        reward: levelId => levelId * 10 
      }
    ]);

    // Setup test store items
    console.log('Creating test store items...');
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
      },
      {
        itemId: "resistor",
        name: "Resistor Pack",
        cost: 15,
        type: "component"
      }
    ]);

    // Setup test shop items
    console.log('Creating test shop items...');
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
      },
      {
        name: "Breadboard",
        description: "For building temporary circuits",
        price: 35,
        image: "breadboard.jpg"
      }
    ]);

    // Setup test inventory items
    console.log('Creating test inventory items...');
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
      },
      {
        itemId: "wire",
        name: "Jumper Wire Set",
        cost: 10,
        effect: "Connects components in circuits"
      }
    ]);

    console.log('Test data setup completed successfully!');
    console.log('Created:');
    console.log('- 5 Levels');
    console.log('- 3 Store Items');
    console.log('- 3 Shop Items');
    console.log('- 3 Inventory Items');

  } catch (error) {
    console.error('Error setting up test data:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run if called directly
if (require.main === module) {
  setupTestData();
}

module.exports = setupTestData;
