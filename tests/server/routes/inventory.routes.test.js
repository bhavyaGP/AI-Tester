jest.mock('../controllers/inventory.controller');
jest.mock('../middleware/authMiddleware');
const router = require('../routes/inventory.routes');
const {getPlayerInventory, buyItem, sellItem} = require('../controllers/inventory.controller');
const authMiddleware = require('../middleware/authMiddleware');


describe('Inventory Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /', () => {
    test('should call getPlayerInventory with authMiddleware', () => {
      const req = {};
      const res = {};
      router.handle( {method: 'GET', url: '/'}, req, res, () => {});
      expect(authMiddleware).toHaveBeenCalled();
      expect(getPlayerInventory).toHaveBeenCalled();
    });
  });

  describe('POST /buy', () => {
    test('should call buyItem with authMiddleware', () => {
      const req = {};
      const res = {};
      router.handle( {method: 'POST', url: '/buy'}, req, res, () => {});
      expect(authMiddleware).toHaveBeenCalled();
      expect(buyItem).toHaveBeenCalled();
    });
    test('should handle errors from buyItem', async () => {
        const req = {};
        const res = {status: jest.fn().mockReturnThis(), json: jest.fn()};
        const next = jest.fn();
        buyItem.mockImplementation(() => {throw new Error('Failed to buy item')});
        router.handle( {method: 'POST', url: '/buy'}, req, res, next);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalled();
        expect(next).not.toHaveBeenCalled();
      });
  });

  describe('POST /sell', () => {
    test('should call sellItem with authMiddleware', () => {
      const req = {};
      const res = {};
      router.handle( {method: 'POST', url: '/sell'}, req, res, () => {});
      expect(authMiddleware).toHaveBeenCalled();
      expect(sellItem).toHaveBeenCalled();
    });
    test('should handle errors from sellItem', async () => {
        const req = {};
        const res = {status: jest.fn().mockReturnThis(), json: jest.fn()};
        const next = jest.fn();
        sellItem.mockImplementation(() => {throw new Error('Failed to sell item')});
        router.handle( {method: 'POST', url: '/sell'}, req, res, next);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalled();
        expect(next).not.toHaveBeenCalled();
      });
  });

  test('should export an express router', () => {
    expect(typeof router.get).toBe('function');
    expect(typeof router.post).toBe('function');
  });
});
