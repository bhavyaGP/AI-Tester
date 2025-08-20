const User = require('../models/user.model');
const Submission = require('../models/Submission.model');

exports.getLeaderboard = async (req, res) => {
  try {
    const users = await User.find().sort({ coins: -1 }).limit(10).select('username coins');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
};

exports.getPlayerStats = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    const submissions = await Submission.find({ userId: req.user._id });
    res.json({ user, submissions });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch player stats' });
  }
};
