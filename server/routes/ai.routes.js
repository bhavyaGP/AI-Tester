const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/giveHint', authMiddleware, aiController.giveHint);
router.post('/solveTask', authMiddleware, aiController.solveTask);

module.exports = router;
