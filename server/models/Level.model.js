const mongoose = require('mongoose');

const levelSchema = new mongoose.Schema({
  levelId: { type: Number, required: true, unique: true },
  title: { type: String, required: true },
  question: { type: String, required: true },
  correctAnswer: { type: String, required: true },
  hints: [String],
  explanation: { type: String },
});

module.exports = mongoose.model('Level', levelSchema); 