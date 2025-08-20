const Level = require("../models/Level.model");
const Submission = require("../models/Submission.model");
const User = require("../models/user.model");

exports.getAvailableLevels = async (req, res) => {
  const user = req.user;
  const levels = await Level.find({ number: { $lte: user.currentLevel } });
  res.json(levels);
};

exports.getLevelDetails = async (req, res) => {
  const { levelNumber } = req.params;
  const level = await Level.findOne({ number: levelNumber });
  res.json(level);
};

exports.getUnlockedLevels = async (req, res) => {
  try {
    const user = req.user;
    console.log(user);
    const levels = await Level.find({ levelId: { $lte: user.level } });
    res.json(levels);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch unlocked levels' });
  }
};

exports.getLevelById = async (req, res) => {
  try {
    const { levelId } = req.params;
    const level = await Level.findOne({ levelId: Number(levelId) });
    if (!level) return res.status(404).json({ error: 'Level not found' });
    res.json(level);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch level' });
  }
};

exports.submitLevelAnswer = async (req, res) => {
  try {
    const { levelId } = req.params;
    const { answer } = req.body;
    const user = req.user;
    const level = await Level.findOne({ levelId: Number(levelId) });
    if (!level) return res.status(404).json({ error: 'Level not found' });
    const isCorrect = level.correctAnswer.trim().toLowerCase() === answer.trim().toLowerCase();
    await Submission.create({ userId: user._id, levelId: Number(levelId), submittedAnswer: answer, isCorrect });
    if (isCorrect && user.level === Number(levelId)) {
      user.level = user.level + 1;
      user.coins += level.coinsRewarded || 0;
      await user.save();
    }
    res.json({ correct: isCorrect, message: isCorrect ? 'Correct! Next level unlocked.' : 'Incorrect. Try again or ask Raju for help.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit answer' });
  }
};

exports.unlockNextLevel = async (req, res) => {
  try {
    const { levelId } = req.params;
    const user = req.user;
    if (user.level === Number(levelId)) {
      user.level = user.level + 1;
      await user.save();
      res.json({ message: 'Next level unlocked', newLevel: user.level });
    } else {
      res.status(400).json({ error: 'Cannot unlock this level yet.' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to unlock next level' });
  }
};
