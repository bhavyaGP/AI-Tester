const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  criteria: String, // e.g. "Complete 5 tasks"
  rewardCoins: Number
});

module.exports = mongoose.model('Achievement', achievementSchema);
