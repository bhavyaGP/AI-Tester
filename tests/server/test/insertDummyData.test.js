const mongoose = require('mongoose');
const Level = require('../models/Level.model');
const Task = require('../models/task.model');
const User = require('../models/user.model');
const insertDummyData = require('../src/dummyDataInserter');


describe('insertDummyData', () => {
  beforeAll(async () => {
    await mongoose.connect('mongodb://localhost:27017/playpowerTest', { useNewUrlParser: true, useUnifiedTopology: true });
  });

  afterAll(async () => {
    await Level.deleteMany({});
    await Task.deleteMany({});
    await User.deleteMany({ username: { $regex: /^physics_kid|test/ } });
    await mongoose.connection.close();
  });

  it('should insert dummy data successfully', async () => {
    const result = await insertDummyData();
    const levelCount = await Level.countDocuments();
    const taskCount = await Task.countDocuments();
    expect(levelCount).toBe(10);
    expect(taskCount).toBe(10);
  });

  it('should handle connection errors gracefully', async () => {
    const originalConnect = mongoose.connect;
    mongoose.connect = jest.fn(() => {
      throw new Error('Failed to connect to MongoDB');
    });
    await expect(insertDummyData()).rejects.toThrow('Failed to connect to MongoDB');
    mongoose.connect = originalConnect;
  });

  it('should handle insertion errors gracefully', async () => {
    const originalInsertMany = Level.insertMany;
    Level.insertMany = jest.fn(() => {
      throw new Error('Failed to insert levels');
    });
    await expect(insertDummyData()).rejects.toThrow('Failed to insert levels');
    Level.insertMany = originalInsertMany;
  });

  it('should clear existing data before insertion', async () => {
    await Level.insertMany([{ levelId: 100, title: 'test' }]);
    await insertDummyData();
    const levelCount = await Level.countDocuments({ levelId: 100 });
    expect(levelCount).toBe(0);
  });

  it('should handle errors during data clearing', async () => {
    const originalDeleteMany = Level.deleteMany;
    Level.deleteMany = jest.fn(() => {
      throw new Error('Failed to clear levels');
    });
    await expect(insertDummyData()).rejects.toThrow('Failed to clear levels');
    Level.deleteMany = originalDeleteMany;
  });
});

