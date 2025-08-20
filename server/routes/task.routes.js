const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.controller');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/:level', authMiddleware, taskController.getLevelTasks); // Get all tasks for a specific level
router.post('/submit', authMiddleware, taskController.submitAnswer);// Submit an answer for a task

module.exports = router;