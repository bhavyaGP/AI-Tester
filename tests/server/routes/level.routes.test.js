const express = require('express');
const router = express.Router();
const levelController = require('../controllers/level.controller');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/unlocked', authMiddleware, levelController.getUnlockedLevels); 
router.get('/:levelId', authMiddleware, levelController.getLevelById); 
router.post('/:levelId/submit', authMiddleware, levelController.submitLevelAnswer); 
router.post('/:levelId/unlock', authMiddleware, levelController.unlockNextLevel); 

module.exports = router;

const request = require('supertest');
const app = express();
app.use('/', router);


describe('Level Routes', () => {
  let server;
  beforeEach(() => {
    server = app.listen(0);
  });
  afterEach(() => {
    server.close();
  });

  describe('GET /unlocked', () => {
    it('should return unlocked levels', async () => {
      const mockUnlockedLevels = [{id:1, name: 'Level 1'}];
      levelController.getUnlockedLevels = jest.fn().mockResolvedValue(mockUnlockedLevels);
      const res = await request(server).get('/unlocked');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockUnlockedLevels);
    });
    it('should handle errors', async () => {
      levelController.getUnlockedLevels = jest.fn().mockRejectedValue(new Error('Failed'));
      const res = await request(server).get('/unlocked');
      expect(res.status).toBe(500);
    });
  });

  describe('GET /:levelId', () => {
    it('should return a specific level', async () => {
      const mockLevel = {id:1, name: 'Level 1'};
      levelController.getLevelById = jest.fn().mockResolvedValue(mockLevel);
      const res = await request(server).get('/1');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockLevel);
    });
    it('should handle errors', async () => {
      levelController.getLevelById = jest.fn().mockRejectedValue(new Error('Failed'));
      const res = await request(server).get('/1');
      expect(res.status).toBe(500);
    });
    it('should handle invalid levelId', async () => {
      levelController.getLevelById = jest.fn().mockRejectedValue(new Error('Level not found'));
      const res = await request(server).get('/abc');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /:levelId/submit', () => {
    it('should submit answer successfully', async () => {
      levelController.submitLevelAnswer = jest.fn().mockResolvedValue({success: true});
      const res = await request(server).post('/1/submit').send({answer: 'test'});
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
    it('should handle errors', async () => {
      levelController.submitLevelAnswer = jest.fn().mockRejectedValue(new Error('Failed'));
      const res = await request(server).post('/1/submit').send({answer: 'test'});
      expect(res.status).toBe(500);
    });
  });

  describe('POST /:levelId/unlock', () => {
    it('should unlock next level', async () => {
      levelController.unlockNextLevel = jest.fn().mockResolvedValue({success: true});
      const res = await request(server).post('/1/unlock');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
    it('should handle errors', async () => {
      levelController.unlockNextLevel = jest.fn().mockRejectedValue(new Error('Failed'));
      const res = await request(server).post('/1/unlock');
      expect(res.status).toBe(500);
    });
  });
});
