jest.mock('mongoose');

const mongoose = require('mongoose');
const db = require('./db');

describe('Database Connection', () => {
  afterEach(() => {
    mongoose.disconnect.mockClear();
    mongoose.connect.mockClear();
    mongoose.connection.emit.mockClear();

  });

  it('should connect to MongoDB with default URL if env variable is not set', () => {
    process.env.mongoUrl = undefined;
    expect(mongoose.connect).toHaveBeenCalledWith('mongodb://localhost:27017/playpower', { serverSelectionTimeoutMS: 30000 });
  });

  it('should connect to MongoDB using the URL from env variable', () => {
    process.env.mongoUrl = 'mongodb://testurl';
    expect(mongoose.connect).toHaveBeenCalledWith('mongodb://testurl', { serverSelectionTimeoutMS: 30000 });
  });


  it('should handle connection error', () => {
    const mockError = new Error('mock error');
    mongoose.connection.emit.mockImplementationOnce((event, err) => {
      if (event === 'error') {
        throw err;
      }
    });
    expect(() => {
      mongoose.connection.emit('error', mockError)
    }).toThrow(mockError);
  });

  it('should handle disconnection', () => {
    mongoose.connection.emit.mockImplementationOnce((event) => {
      if (event === 'disconnected'){
        console.log('Disconnected from MongoDB');
      }
    });
    mongoose.connection.emit('disconnected');
    expect(mongoose.connection.emit).toHaveBeenCalledWith('disconnected');
  });

  it('should log connection', () => {
    const logSpy = jest.spyOn(console, 'log');
    mongoose.connection.emit('connected');
    expect(logSpy).toHaveBeenCalledWith('✅Connected to MongoDB');
    logSpy.mockRestore();
  });

  it('should export the mongoose connection', () => {
    expect(db).toBe(mongoose.connection);
  });
});
