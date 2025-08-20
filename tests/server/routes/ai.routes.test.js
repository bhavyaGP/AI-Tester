jest.mock('../controllers/ai.controller');
jest.mock('../middleware/authMiddleware');

const router = require('../routes/ai.routes');
const {giveHint, solveTask} = require('../controllers/ai.controller');
const authMiddleware = require('../middleware/authMiddleware');

describe('AI Router', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /giveHint', () => {
    test('should call giveHint controller with middleware', () => {
      const req = {};
      const res = {};
      const next = jest.fn();
      router.handle({method: 'POST', url: '/giveHint'}, req, res, next);
      expect(authMiddleware).toHaveBeenCalledWith(req, res, expect.any(Function));
      expect(giveHint).toHaveBeenCalledWith(req, res, next);
    });

    test('should handle errors from giveHint', () => {
      const error = new Error('Give hint failed');
      giveHint.mockImplementation((req,res,next) => next(error));
      const req = {};
      const res = {};
      const next = jest.fn();
      router.handle({method: 'POST', url: '/giveHint'}, req, res, next);
      expect(next).toHaveBeenCalledWith(error);
    });

    test('should handle errors from authMiddleware', () => {
      const error = new Error('Auth failed');
      authMiddleware.mockImplementation((req,res,next) => next(error));
      const req = {};
      const res = {};
      const next = jest.fn();
      router.handle({method: 'POST', url: '/giveHint'}, req, res, next);
      expect(next).toHaveBeenCalledWith(error);
    });

  });

  describe('POST /solveTask', () => {
    test('should call solveTask controller with middleware', () => {
      const req = {};
      const res = {};
      const next = jest.fn();
      router.handle({method: 'POST', url: '/solveTask'}, req, res, next);
      expect(authMiddleware).toHaveBeenCalledWith(req, res, expect.any(Function));
      expect(solveTask).toHaveBeenCalledWith(req, res, next);
    });

    test('should handle errors from solveTask', () => {
      const error = new Error('Solve task failed');
      solveTask.mockImplementation((req,res,next) => next(error));
      const req = {};
      const res = {};
      const next = jest.fn();
      router.handle({method: 'POST', url: '/solveTask'}, req, res, next);
      expect(next).toHaveBeenCalledWith(error);
    });

    test('should handle errors from authMiddleware', () => {
      const error = new Error('Auth failed');
      authMiddleware.mockImplementation((req,res,next) => next(error));
      const req = {};
      const res = {};
      const next = jest.fn();
      router.handle({method: 'POST', url: '/solveTask'}, req, res, next);
      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
