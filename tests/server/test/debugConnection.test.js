jest.mock('axios');

const {testServerConnection} = require('./your_file_name'); // Replace your_file_name
const axios = require('axios');

describe('testServerConnection', () => {
  it('should successfully test server connection and API endpoints', async () => {
    axios.get.mockResolvedValue({data: 'Server is running'});
    axios.post.mockResolvedValueOnce({data: 'Registration successful'}).mockResolvedValueOnce({data: 'Hint received'});
    await expect(testServerConnection()).resolves.toBeUndefined();
    expect(axios.get).toHaveBeenCalledWith('http://localhost:3000');
    expect(axios.post).toHaveBeenCalledWith('http://localhost:3000/api/auth/register', {username: 'test_debug_user', password: 'test1234', email: 'test@debug.com'});
    expect(axios.post).toHaveBeenCalledWith('http://localhost:3000/api/llm/hint/0', {playerInput: 'I need help!'});
  });

  it('should handle server connection error', async () => {
    axios.get.mockRejectedValue(new Error('Server not found'));
    await expect(testServerConnection()).resolves.toBeUndefined();
    expect(console.log).toHaveBeenCalledWith('❌ Server not running or not accessible: Server not found');
  });

  it('should handle registration endpoint error', async () => {
    axios.get.mockResolvedValue({data: 'Server is running'});
    axios.post.mockRejectedValueOnce(new Error('Registration failed')).mockResolvedValueOnce({data: 'Hint received'});
    await expect(testServerConnection()).resolves.toBeUndefined();
    expect(console.log).toHaveBeenCalledWith('❌ Registration failed:', {status: undefined, data: undefined, message: 'Registration failed'});
  });

  it('should handle hint endpoint error', async () => {
    axios.get.mockResolvedValue({data: 'Server is running'});
    axios.post.mockResolvedValueOnce({data: 'Registration successful'}).mockRejectedValueOnce(new Error('Hint failed'));
    await expect(testServerConnection()).resolves.toBeUndefined();
    expect(console.log).toHaveBeenCalledWith('❌ Hint endpoint failed:', {status: undefined, data: undefined, message: 'Hint failed'});
  });

  it('should handle axios error with response data', async () => {
    axios.get.mockResolvedValue({data: 'Server is running'});
    axios.post.mockRejectedValueOnce({response: {status: 400, data: {error: 'Bad Request'}}}).mockResolvedValueOnce({data: 'Hint received'});
    await expect(testServerConnection()).resolves.toBeUndefined();
    expect(console.log).toHaveBeenCalledWith('❌ Registration failed:', {status: 400, data: {error: 'Bad Request'}, message: expect.any(String)});
  });

});
