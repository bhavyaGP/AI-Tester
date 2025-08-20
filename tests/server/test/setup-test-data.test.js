const setupTestData = require('../setupTestData');
const mongoose = require('mongoose');
const Level = require('../models/Level.model');
const StoreItem = require('../models/StoreItem.model');
const ShopItem = require('../models/ShopItem.model');
const InventoryItem = require('../models/InventoryItem.model');

describe('setupTestData', () => {
  beforeAll(async () => {
    process.env.mongoUrl = 'mongodb://localhost:27017/test'; 
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('should connect to the database and setup test data successfully', async () => {
    await setupTestData();
    const levels = await Level.find({});
    const storeItems = await StoreItem.find({});
    const shopItems = await ShopItem.find({});
    const inventoryItems = await InventoryItem.find({});
    expect(levels.length).toBe(5);
    expect(storeItems.length).toBe(3);
    expect(shopItems.length).toBe(3);
    expect(inventoryItems.length).toBe(3);
  });

  it('should handle database connection errors gracefully', async () => {
    const originalMongoUrl = process.env.mongoUrl;
    process.env.mongoUrl = 'mongodb://invalid-host:27017/test';
    try {
      await setupTestData();
    } catch (error) {
      expect(error).toBeDefined();
    } finally {
      process.env.mongoUrl = originalMongoUrl;
    }

  });


  it('should clear existing data before inserting new data', async () => {
    await Level.insertMany([{levelId: 100, title: 'test'}]);
    await setupTestData();
    const levels = await Level.find({});
    expect(levels.length).toBe(5);
    expect(levels.some(level => level.levelId === 100)).toBe(false);

  });

  it('should handle errors during data insertion gracefully', async () => {
    const originalInsertMany = Level.insertMany;
    Level.insertMany = async () => { throw new Error('mock error'); };
    try {
      await setupTestData();
    } catch (error) {
      expect(error).toBeDefined();
    } finally {
      Level.insertMany = originalInsertMany;
    }
  });
});
