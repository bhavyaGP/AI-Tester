const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const authMiddleware = require('../middleware/authMiddleware');


router.post('/ask', authMiddleware, aiController.askLLM); //return response from LLM

router.post('/hint/:levelId', authMiddleware, aiController.giveHintForLevel); //return contextual hint for a specific level from Raju

router.post('/explanation/:levelId', authMiddleware, aiController.getExplanationForLevel);

module.exports = router;