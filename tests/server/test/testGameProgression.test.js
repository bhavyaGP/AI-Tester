jest.mock('axios');
jest.mock('mongoose');
jest.mock('../models/user.model');

const axios = require('axios');
const {testGameProgression} = require('./gameProgression'); // Assuming file name is gameProgression.js

const mockUser = {save: jest.fn()};
const mockModel = jest.fn().mockReturnValue({create: jest.fn().mockResolvedValue(mockUser)});
jest.mock('../models/user.model', () => mockModel);


describe('testGameProgression', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully complete game progression', async () => {
    axios.post.mockResolvedValueOnce({data: {token: 'testToken'}});
    for (let i = 0; i < 10; i++) {
      axios.post.mockResolvedValueOnce({data: 'hint'});
      axios.post.mockResolvedValueOnce({data: 'answer'});
      axios.post.mockResolvedValueOnce({data: 'explanation'});
    }
    await testGameProgression();
    expect(axios.post).toHaveBeenCalledTimes(31);
    expect(console.error).not.toHaveBeenCalled();
  });


  it('should handle errors during level operations', async () => {
    axios.post.mockResolvedValueOnce({data: {token: 'testToken'}});
    axios.post.mockRejectedValueOnce(new Error('Level error'));
    for (let i = 1; i < 10; i++) {
      axios.post.mockResolvedValueOnce({data: 'hint'});
      axios.post.mockResolvedValueOnce({data: 'answer'});
      axios.post.mockResolvedValueOnce({data: 'explanation'});
    }
    await testGameProgression();
    expect(axios.post).toHaveBeenCalledTimes(29);
    expect(console.error).toHaveBeenCalled();
  });

  it('should handle registration errors', async () => {
    axios.post.mockRejectedValueOnce(new Error('Registration error'));
    await testGameProgression();
    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalled();
  });

  it('should handle general errors', async () => {
    axios.post.mockResolvedValueOnce({data: {token: 'testToken'}});
    axios.post.mockRejectedValueOnce(new Error('General error'));
    await testGameProgression();
    expect(axios.post).toHaveBeenCalledTimes(2);
    expect(console.error).toHaveBeenCalled();
  });
});
