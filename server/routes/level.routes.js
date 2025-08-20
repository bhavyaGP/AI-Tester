const express = require('express');
const router = express.Router();
const levelController = require('../controllers/level.controller');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/unlocked', authMiddleware, levelController.getUnlockedLevels); //returns all levels that are unlocked for the user

router.get('/:levelId', authMiddleware, levelController.getLevelById); //returns a specific level by ID

router.post('/:levelId/submit', authMiddleware, levelController.submitLevelAnswer); // submits the answer for a specific level

router.post('/:levelId/unlock', authMiddleware, levelController.unlockNextLevel); // unlocks the next level for the user

module.exports = router;