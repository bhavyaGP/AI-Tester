jest.mock('../controllers/ai.controller');
jest.mock('../middleware/authMiddleware');
const router = require('../routes/ai.routes');
const {askLLM, giveHintForLevel, getExplanationForLevel} = require('../controllers/ai.controller');
const authMiddleware = require('../middleware/authMiddleware');

describe('AI Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /ask', () => {
    test('should call aiController.askLLM with middleware', () => {
      const req = {};
      const res = {};
      router.handle({method: 'POST', url: '/ask'}, req, res);
      expect(authMiddleware).toHaveBeenCalledWith(req, res, expect.any(Function));
      expect(askLLM).toHaveBeenCalledWith(req, res);
    });
  });

  describe('POST /hint/:levelId', () => {
    test('should call aiController.giveHintForLevel with middleware and params', () => {
      const req = {params: {levelId: 1}};
      const res = {};
      router.handle({method: 'POST', url: '/hint/1'}, req, res);
      expect(authMiddleware).toHaveBeenCalledWith(req, res, expect.any(Function));
      expect(giveHintForLevel).toHaveBeenCalledWith(req, res);
    });
    test('should handle non-numeric levelId', () => {
      const req = {params: {levelId: 'abc'}};
      const res = {status: jest.fn().mockReturnThis(), send: jest.fn()};
      router.handle({method: 'POST', url: '/hint/abc'}, req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({error: expect.any(String)});
    });

  });

  describe('POST /explanation/:levelId', () => {
    test('should call aiController.getExplanationForLevel with middleware and params', () => {
      const req = {params: {levelId: 1}};
      const res = {};
      router.handle({method: 'POST', url: '/explanation/1'}, req, res);
      expect(authMiddleware).toHaveBeenCalledWith(req, res, expect.any(Function));
      expect(getExplanationForLevel).toHaveBeenCalledWith(req, res);
    });
    test('should handle missing levelId', () => {
        const req = {params: {}};
        const res = {status: jest.fn().mockReturnThis(), send: jest.fn()};
        router.handle({method: 'POST', url: '/explanation/'}, req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({error: expect.any(String)});
      });
  });
});

  
