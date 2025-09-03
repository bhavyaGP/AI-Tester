const mongoose = require('mongoose');
const db = require('../../server/db.js');

describe('Database Connection', () => {
  afterAll(() => {
    mongoose.disconnect();
  });

  it('should connect to the database successfully', async () => {
    const mockConnection = {
      on: jest.fn(),
      once: jest.fn(),
      close: jest.fn(),
    };
    mongoose.connect = jest.fn().mockResolvedValue(mockConnection);
    await db;
    expect(mongoose.connect).toHaveBeenCalledWith('mongodb://localhost:27017/MEAN');
    expect(mongoose.connection.readyState).toBe(1);
  });

  it('should handle connection errors gracefully', async () => {
    const mockError = new Error('Failed to connect');
    mongoose.connect = jest.fn().mockRejectedValue(mockError);
    try {
      await db;
    } catch (err) {
      expect(err).toEqual(mockError);
      expect(mongoose.connect).toHaveBeenCalledWith('mongodb://localhost:27017/MEAN');
    }
  });


  it('should export the mongoose object', () => {
    expect(db).toBe(mongoose);
  });
});
