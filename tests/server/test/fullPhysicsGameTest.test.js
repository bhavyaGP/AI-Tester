const axios = require('axios');
const mongoose = require('mongoose');
const Level = require('../models/Level.model');
const User = require('../models/user.model');
const runFullTest = require('../src/test_script');

jest.mock('axios');
jest.mock('mongoose');

describe('runFullTest', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully register, login, fetch levels, and complete game simulation', async () => {
    const mockLevels = [{ levelId: 0, title: 'Level 0', question: 'Question 0', correctAnswer: 'Answer 0' }];
    const mockUser = { _id: 'testUserId', level: 0, coins: 0 };
    const mockToken = 'testToken';
    mongoose.connect.mockResolvedValue(true);
    Level.find.mockResolvedValue(mockLevels);
    axios.post.mockResolvedValueOnce({ data: { user: { _id: 'testUserId' } } }).mockResolvedValueOnce({ data: { token: mockToken, user: mockUser } }).mockResolvedValueOnce({ data: { hint: 'testHint' } }).mockResolvedValueOnce({ data: { message: 'Correct answer' } }).mockResolvedValueOnce({ data: { explanation: 'testExplanation' } }).mockResolvedValueOnce({ data: { message: 'Wrong answer' } });
    User.findById.mockResolvedValue(mockUser).mockResolvedValueOnce({ level: 1, coins: 100 });
    const results = await runFullTest();
    expect(results).toBeDefined();
  });

  it('should handle registration failure', async () => {
    axios.post.mockRejectedValueOnce({ response: { data: 'Registration failed' } });
    await expect(runFullTest()).rejects.toThrow();
  });

  it('should handle login failure', async () => {
    axios.post.mockResolvedValueOnce({ data: { user: { _id: 'testUserId' } } }).mockRejectedValueOnce({ response: { data: 'Login failed' } });
    await expect(runFullTest()).rejects.toThrow();
  });

  it('should handle database connection failure', async () => {
    mongoose.connect.mockRejectedValueOnce(new Error('DB connection failed'));
    await expect(runFullTest()).rejects.toThrow();
  });

  it('should handle level fetching failure', async () => {
    mongoose.connect.mockResolvedValue(true);
    Level.find.mockRejectedValueOnce(new Error('Level fetching failed'));
    await expect(runFullTest()).rejects.toThrow();
  });

  it('should handle hint failure', async () => {
    mongoose.connect.mockResolvedValue(true);
    Level.find.mockResolvedValue([{ levelId: 0, title: 'Level 0', question: 'Question 0', correctAnswer: 'Answer 0' }]);
    axios.post.mockResolvedValueOnce({ data: { user: { _id: 'testUserId' } } }).mockResolvedValueOnce({ data: { token: 'testToken', user: { _id: 'testUserId' } } }).mockRejectedValueOnce({ response: { data: 'Hint failed' } });
    await expect(runFullTest()).resolves.not.toThrow();
  });

  it('should handle answer submission failure', async () => {
    mongoose.connect.mockResolvedValue(true);
    Level.find.mockResolvedValue([{ levelId: 0, title: 'Level 0', question: 'Question 0', correctAnswer: 'Answer 0' }]);
    axios.post.mockResolvedValueOnce({ data: { user: { _id: 'testUserId' } } }).mockResolvedValueOnce({ data: { token: 'testToken', user: { _id: 'testUserId' } } }).mockResolvedValueOnce({ data: { hint: 'testHint' } }).mockRejectedValueOnce({ response: { data: 'Submission failed' } });
    await expect(runFullTest()).resolves.not.toThrow();
  });

  it('should handle explanation failure', async () => {
    mongoose.connect.mockResolvedValue(true);
    Level.find.mockResolvedValue([{ levelId: 0, title: 'Level 0', question: 'Question 0', correctAnswer: 'Answer 0' }]);
    axios.post.mockResolvedValueOnce({ data: { user: { _id: 'testUserId' } } }).mockResolvedValueOnce({ data: { token: 'testToken', user: { _id: 'testUserId' } } }).mockResolvedValueOnce({ data: { hint: 'testHint' } }).mockResolvedValueOnce({ data: { message: 'Correct answer' } }).mockRejectedValueOnce({ response: { data: 'Explanation failed' } });
    await expect(runFullTest()).resolves.not.toThrow();
  });


  it('should handle invalid token', async () => {
    axios.post.mockResolvedValueOnce({ data: { user: { _id: 'testUserId' } } }).mockResolvedValueOnce({ data: { token: 'testToken', user: { _id: 'testUserId' } } }).mockRejectedValueOnce({ response: { data: 'Invalid token' } });
    await expect(runFullTest()).resolves.not.toThrow();
  });

  it('should handle invalid level ID', async () => {
    axios.post.mockResolvedValueOnce({ data: { user: { _id: 'testUserId' } } }).mockResolvedValueOnce({ data: { token: 'testToken', user: { _id: 'testUserId' } } }).mockRejectedValueOnce({ response: { data: 'Invalid level ID' } });
    await expect(runFullTest()).resolves.not.toThrow();
  });

  it('should handle wrong answer submission', async () => {
      mongoose.connect.mockResolvedValue(true);
      Level.find.mockResolvedValue([{ levelId: 0, title: 'Level 0', question: 'Question 0', correctAnswer: 'Answer 0' }]);
      axios.post.mockResolvedValueOnce({ data: { user: { _id: 'testUserId' } } }).mockResolvedValueOnce({ data: { token: 'testToken', user: { _id: 'testUserId' } } }).mockResolvedValueOnce({ data: { hint: 'testHint' } }).mockResolvedValueOnce({ data: { message: 'Wrong answer' } }).mockResolvedValueOnce({ data: { explanation: 'testExplanation' } }).mockResolvedValueOnce({ data: { message: 'Wrong answer' } });
      await expect(runFullTest()).resolves.not.toThrow();
  });

});

describe('printResults', () => {
  it('should print test results', () => {
    const results = [{ step: 'test1', success: true }, { step: 'test2', success: false, error: 'Error' }];
    console.log = jest.fn();
    printResults(results);
    expect(console.log).toHaveBeenCalled();
  });
});
