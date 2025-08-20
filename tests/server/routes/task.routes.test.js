const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.controller');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/:level', authMiddleware, taskController.getLevelTasks);
router.post('/submit', authMiddleware, taskController.submitAnswer);

module.exports = router;

jest.mock('../controllers/task.controller');
jest.mock('../middleware/authMiddleware');

describe('taskRouter', () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });


  describe('GET /:level', () => {
    it('should call getLevelTasks with correct params', () => {
      req.params = { level: 1 };
      router.handle({ url: '/1', method: 'GET' }, req, res, next);
      expect(authMiddleware).toHaveBeenCalledWith(req, res, expect.any(Function));
      expect(taskController.getLevelTasks).toHaveBeenCalledWith(req, res, next);
    });

    it('should handle errors correctly', () => {
      const error = new Error('Failed to get tasks');
      taskController.getLevelTasks.mockImplementation((req, res, next) => next(error));
      req.params = { level: 1 };
      router.handle({ url: '/1', method: 'GET' }, req, res, next);
      expect(next).toHaveBeenCalledWith(error);
    });

    it('should handle invalid level parameter', () => {
      req.params = { level: 'abc' };
      router.handle({ url: '/abc', method: 'GET' }, req, res, next);
      expect(authMiddleware).toHaveBeenCalledWith(req, res, expect.any(Function));
      expect(taskController.getLevelTasks).toHaveBeenCalledWith(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });


  });

  describe('POST /submit', () => {
    it('should call submitAnswer with correct params', () => {
      req.body = { answer: 'test' };
      router.handle({ url: '/submit', method: 'POST' }, req, res, next);
      expect(authMiddleware).toHaveBeenCalledWith(req, res, expect.any(Function));
      expect(taskController.submitAnswer).toHaveBeenCalledWith(req, res, next);
    });

    it('should handle errors correctly', () => {
      const error = new Error('Failed to submit answer');
      taskController.submitAnswer.mockImplementation((req, res, next) => next(error));
      req.body = { answer: 'test' };
      router.handle({ url: '/submit', method: 'POST' }, req, res, next);
      expect(next).toHaveBeenCalledWith(error);
    });

    it('should handle missing answer parameter', () => {
      req.body = {};
      router.handle({ url: '/submit', method: 'POST' }, req, res, next);
      expect(authMiddleware).toHaveBeenCalledWith(req, res, expect.any(Function));
      expect(taskController.submitAnswer).toHaveBeenCalledWith(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
