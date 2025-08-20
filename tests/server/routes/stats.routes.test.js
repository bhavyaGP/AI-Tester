jest.mock('../controllers/gameController.controller');
jest.mock('../middleware/authMiddleware');
const router = require('../routes/gameRoutes');
const {getLeaderboard, getPlayerStats} = require('../controllers/gameController.controller');
const authMiddleware = require('../middleware/authMiddleware');

describe('gameRoutes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /leaderboard', () => {
    it('should call authMiddleware and gameController.getLeaderboard', () => {
      const req = {};
      const res = {};
      router.handle({method: 'GET', url: '/leaderboard'}, req, res);
      expect(authMiddleware).toHaveBeenCalledWith(req, res, expect.any(Function));
      expect(getLeaderboard).toHaveBeenCalled();
    });
  });

  describe('GET /player', () => {
    it('should call authMiddleware and gameController.getPlayerStats', () => {
      const req = {};
      const res = {};
      router.handle({method: 'GET', url: '/player'}, req, res);
      expect(authMiddleware).toHaveBeenCalledWith(req, res, expect.any(Function));
      expect(getPlayerStats).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle errors from authMiddleware', () => {
      authMiddleware.mockImplementation((req, res, next) => {
        const err = new Error('Authentication failed');
        next(err);
      });
      const req = {};
      const res = {
        status: jest.fn(() => ({send: jest.fn()}))
      };
      router.handle({method: 'GET', url: '/leaderboard'}, req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.status().send).toHaveBeenCalled();
    });

    it('should handle errors from gameController', () => {
      getLeaderboard.mockImplementation(() => { throw new Error('Database error');});
      const req = {};
      const res = {
        status: jest.fn(() => ({send: jest.fn()}))
      };
      authMiddleware.mockImplementation((req, res, next) => next());
      router.handle({method: 'GET', url: '/leaderboard'}, req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.status().send).toHaveBeenCalled();
    });
  });

  it('should export an express router', () => {
    expect(typeof router.get).toBe('function');
  });

});
