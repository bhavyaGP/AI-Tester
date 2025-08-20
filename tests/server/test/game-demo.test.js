const GameTester = require('./game_tester');
const axios = require('axios');

jest.mock('axios');

describe('GameTester', () => {
  let tester;
  beforeEach(() => {
    tester = new GameTester();
    axios.mockReset();
  });

  describe('makeRequest', () => {
    it('should make a successful GET request', async () => {
      axios.mockResolvedValue({ data: { success: true } });
      const result = await tester.makeRequest('GET', '/test');
      expect(result).toEqual({ success: true });
      expect(axios.mock.calls[0][0].url).toBe('http://localhost:3000/api/test');
    });

    it('should make a successful POST request with data', async () => {
      axios.mockResolvedValue({ data: { success: true } });
      const result = await tester.makeRequest('POST', '/test', { data: 'test' });
      expect(result).toEqual({ success: true });
      expect(axios.mock.calls[0][0].data).toEqual({ data: 'test' });
    });

    it('should handle a request error', async () => {
      axios.mockRejectedValue({ response: { data: { error: 'test error' }, status: 500, statusText: 'Internal Server Error' } });
      await expect(tester.makeRequest('GET', '/test')).rejects.toThrow('test error');
    });

    it('should add authorization header if token is present', async () => {
      tester.token = 'testtoken';
      axios.mockResolvedValue({ data: { success: true } });
      await tester.makeRequest('GET', '/test');
      expect(axios.mock.calls[0][0].headers.Authorization).toBe('Bearer testtoken');
    });

    it('should not add authorization header if useAuth is false', async () => {
      tester.token = 'testtoken';
      axios.mockResolvedValue({ data: { success: true } });
      await tester.makeRequest('GET', '/test', null, false);
      expect(axios.mock.calls[0][0].headers.Authorization).toBeUndefined();
    });
  });

  describe('register', () => {
    it('should register a new player', async () => {
      const mockResponse = { user: { _id: '123', username: 'testuser' } };
      axios.mockResolvedValueOnce({ data: mockResponse });
      const result = await tester.register();
      expect(result).toEqual(mockResponse);
      expect(tester.userId).toBe('123');
    });

    it('should handle registration errors', async () => {
      axios.mockRejectedValueOnce({ response: { data: { error: 'registration failed' } } });
      await expect(tester.register()).rejects.toThrow('registration failed');
    });
  });


  describe('login', () => {
    it('should login successfully', async () => {
      const mockResponse = { token: 'testtoken' };
      axios.mockResolvedValueOnce({ data: mockResponse });
      const result = await tester.login('testuser', 'testpassword');
      expect(result).toEqual(mockResponse);
      expect(tester.token).toBe('testtoken');
    });
    it('should handle login errors', async () => {
      axios.mockRejectedValueOnce({ response: { data: { error: 'login failed' } } });
      await expect(tester.login('testuser', 'testpassword')).rejects.toThrow('login failed');
    });
  });

  describe('getProfile', () => {
    it('should get the player profile', async () => {
      axios.mockResolvedValueOnce({ data: { user: { username: 'testuser', level: 5, coins: 100 } } });
      const result = await tester.getProfile();
      expect(result.user.username).toBe('testuser');
      expect(tester.currentLevel).toBe(5);
    });
    it('should handle profile errors', async () => {
      axios.mockRejectedValueOnce({ response: { data: { error: 'profile failed' } } });
      await expect(tester.getProfile()).rejects.toThrow('profile failed');
    });
  });

  describe('getUnlockedLevels', () => {
    it('should get unlocked levels', async () => {
      axios.mockResolvedValueOnce({ data: [{ levelId: 1, title: 'Level 1' }] });
      const result = await tester.getUnlockedLevels();
      expect(result).toEqual([{ levelId: 1, title: 'Level 1' }]);
    });
    it('should handle errors', async () => {
      axios.mockRejectedValueOnce({ response: { data: { error: 'levels failed' } } });
      await expect(tester.getUnlockedLevels()).rejects.toThrow('levels failed');
    });
  });

  describe('getLevelDetails', () => {
    it('should get level details', async () => {
      axios.mockResolvedValueOnce({ data: { title: 'Level 1', question: 'What is the answer?' } });
      const result = await tester.getLevelDetails(1);
      expect(result.title).toBe('Level 1');
    });
    it('should handle errors', async () => {
      axios.mockRejectedValueOnce({ response: { data: { error: 'level details failed' } } });
      await expect(tester.getLevelDetails(1)).rejects.toThrow('level details failed');
    });
  });

  describe('getLLMHint', () => {
    it('should get LLM hint', async () => {
      axios.mockResolvedValueOnce({ data: { hint: 'test hint' } });
      const result = await tester.getLLMHint(1);
      expect(result.hint).toBe('test hint');
    });
    it('should handle LLM errors', async () => {
      axios.mockRejectedValueOnce({ response: { data: { error: 'LLM failed' } } });
      const result = await tester.getLLMHint(1);
      expect(result.hint).toBe('LLM service unavailable');
    });
  });

  describe('askLLMQuestion', () => {
    it('should ask LLM a question', async () => {
      axios.mockResolvedValueOnce({ data: { response: 'test response' } });
      const result = await tester.askLLMQuestion('test question');
      expect(result.response).toBe('test response');
    });
    it('should handle LLM errors', async () => {
      axios.mockRejectedValueOnce({ response: { data: { error: 'LLM failed' } } });
      const result = await tester.askLLMQuestion('test question');
      expect(result.response).toBe('LLM service unavailable');
    });
  });

  describe('getAIHint', () => {
    it('should get AI hint', async () => {
      axios.mockResolvedValueOnce({ data: { hint: 'test hint' } });
      const result = await tester.getAIHint('test input');
      expect(result.hint).toBe('test hint');
    });
    it('should handle AI errors', async () => {
      axios.mockRejectedValueOnce({ response: { data: { error: 'AI failed' } } });
      const result = await tester.getAIHint('test input');
      expect(result.hint).toBe('AI service unavailable');
    });
  });

  describe('submitAnswer', () => {
    it('should submit a correct answer', async () => {
      axios.mockResolvedValueOnce({ data: { correct: true, message: 'Correct!' } });
      const result = await tester.submitAnswer(1, 'correct answer');
      expect(result.correct).toBe(true);
      expect(tester.currentLevel).toBe(2);
    });
    it('should submit a wrong answer', async () => {
      axios.mockResolvedValueOnce({ data: { correct: false, message: 'Incorrect!' } });
      const result = await tester.submitAnswer(1, 'wrong answer');
      expect(result.correct).toBe(false);
      expect(tester.currentLevel).toBe(1);
    });
    it('should handle submission errors', async () => {
      axios.mockRejectedValueOnce({ response: { data: { error: 'submission failed' } } });
      await expect(tester.submitAnswer(1, 'wrong answer')).rejects.toThrow('submission failed');
    });
  });

  describe('getInventory', () => {
    it('should get inventory', async () => {
      axios.mockResolvedValueOnce({ data: [{ item: 'item1', qty: 2 }] });
      const result = await tester.getInventory();
      expect(result).toEqual([{ item: 'item1', qty: 2 }]);
    });
    it('should handle errors', async () => {
      axios.mockRejectedValueOnce({ response: { data: { error: 'inventory failed' } } });
      await expect(tester.getInventory()).rejects.toThrow('inventory failed');
    });
  });

  describe('getShopItems', () => {
    it('should get shop items', async () => {
      axios.mockResolvedValueOnce({ data: [{ name: 'item1', price: 10, description: 'test' }] });
      const result = await tester.getShopItems();
      expect(result).toEqual([{ name: 'item1', price: 10, description: 'test' }]);
    });
    it('should handle errors', async () => {
      axios.mockRejectedValueOnce({ response: { data: { error: 'shop failed' } } });
      await expect(tester.getShopItems()).rejects.toThrow('shop failed');
    });
  });


  describe('getStoreItems', () => {
    it('should get store items', async () => {
      axios.mockResolvedValueOnce({ data: [{ name: 'item1', cost: 10, type: 'tool' }] });
      const result = await tester.getStoreItems();
      expect(result).toEqual([{ name: 'item1', cost: 10, type: 'tool' }]);
    });
    it('should handle errors', async () => {
      axios.mockRejectedValueOnce({ response: { data: { error: 'store failed' } } });
      await expect(tester.getStoreItems()).rejects.toThrow('store failed');
    });
  });


  describe('buyStoreItem', () => {
    it('should buy a store item', async () => {
      axios.mockResolvedValueOnce({ data: { message: 'Item bought!', coins: 50 } });
      const result = await tester.buyStoreItem(1);
      expect(result.message).toBe('Item bought!');
    });
    it('should handle buy errors', async () => {
      axios.mockRejectedValueOnce({ response: { data: { error: 'buy failed' } } });
      const result = await tester.buyStoreItem(1);
      expect(result).toBe(null);
    });
  });

  describe('getPlayerStats', () => {
    it('should get player stats', async () => {
      axios.mockResolvedValueOnce({ data: { user: { level: 5, coins: 100, toolsUnlocked: [] }, submissions: [] } });
      const result = await tester.getPlayerStats();
      expect(result.user.level).toBe(5);
    });
    it('should handle errors', async () => {
      axios.mockRejectedValueOnce({ response: { data: { error: 'stats failed' } } });
      await expect(tester.getPlayerStats()).rejects.toThrow('stats failed');
    });
  });

  describe('getLeaderboard', () => {
    it('should get leaderboard', async () => {
      axios.mockResolvedValueOnce({ data: [{ username: 'testuser', coins: 100 }] });
      const result = await tester.getLeaderboard();
      expect(result).toEqual([{ username: 'testuser', coins: 100 }]);
    });
    it('should handle errors', async () => {
      axios.mockRejectedValueOnce({ response: { data: { error: 'leaderboard failed' } } });
      await expect(tester.getLeaderboard()).rejects.toThrow('leaderboard failed');
    });
  });

  describe('playLevel', () => {
    it('should play a level successfully', async () => {
      axios.mockResolvedValueOnce({ data: { title: 'Level 1', question: 'test question' } });
      axios.mockResolvedValueOnce({ data: { hint: 'test hint' } });
      axios.mockResolvedValueOnce({ data: { correct: false, message: 'Incorrect!' } });
      axios.mockResolvedValueOnce({ data: { correct: true, message: 'Correct!' } });
      axios.mockResolvedValueOnce({ data: { explanation: 'test explanation' } });
      const result = await tester.playLevel(1, 'battery');
      expect(result.correct).toBe(true);
    });
    it('should handle errors during level play', async () => {
      axios.mockRejectedValueOnce({ response: { data: { error: 'level details failed' } } });
      await expect(tester.playLevel(1, 'battery')).rejects.toThrow('level details failed');
    });

    it('should handle LLM explanation errors', async () => {
      axios.mockResolvedValueOnce({ data: { title: 'Level 1', question: 'test question' } });
      axios.mockResolvedValueOnce({ data: { hint: 'test hint' } });
      axios.mockResolvedValueOnce({ data: { correct: true, message: 'Correct!' } });
      axios.mockRejectedValueOnce({ response: { data: { error: 'explanation failed' } } });
      const result = await tester.playLevel(1, 'battery');
      expect(result.correct).toBe(true);
    });
  });

  describe('runCompleteGameDemo', () => {
    it('should run the complete game demo successfully', async () => {
      axios.mockResolvedValueOnce({ data: { user: { _id: '1', username: 'testuser' } } });
      axios.mockResolvedValueOnce({ data: { token: 'testtoken' } });
      axios.mockResolvedValueOnce({ data: { user: { username: 'testuser', level: 1, coins: 0 } } });
      axios.mockResolvedValueOnce({ data: [] });
      axios.mockResolvedValueOnce({ data: { response: 'test response' } });
      axios.mockResolvedValueOnce({ data: { hint: 'test hint' } });
      axios.mockResolvedValueOnce({ data: [] });
      axios.mockResolvedValueOnce({ data: [] });
      axios.mockResolvedValueOnce({ data: [] });
      axios.mockResolvedValueOnce({ data: { correct: true, message: 'Correct!' } });
      axios.mockResolvedValueOnce({ data: { title: 'Level 1', question: 'test question' } });
      axios.mockResolvedValueOnce({ data: { hint: 'test hint' } });
      axios.mockResolvedValueOnce({ data: { explanation: 'test explanation' } });
      axios.mockResolvedValueOnce({ data: { correct: true, message: 'Correct!' } });      
      axios.mockResolvedValueOnce({ data: { user: { username: 'testuser', level: 3, coins: 0 } } });      
      axios.mockResolvedValueOnce({ data: { user: { level: 3, coins: 0, toolsUnlocked: [] }, submissions: [] } });      
      axios.mockResolvedValueOnce({ data: [{ username: 'testuser', coins: 100 }] });      
      axios.mockResolvedValueOnce({ data: [] });
      await tester.runCompleteGameDemo();

    });
    it('should handle errors during the demo', async () => {
      axios.mockRejectedValueOnce({ response: { data: { error: 'registration failed' } } });
      await expect(tester.runCompleteGameDemo()).rejects.toThrow('registration failed');
    });
  });
});
