const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController.controller');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/leaderboard', authMiddleware, gameController.getLeaderboard);
router.get('/player', authMiddleware, gameController.getPlayerStats);

module.exports = router; 