const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  taskId: { type: String, required: true, unique: true },
  level: { type: Number, required: true },
  problem: { type: String, required: true },
  correctAnswer: { type: String, required: true },
  hint: { type: String },
  toolsRequired: [String],
  reward: Number,
  solution: String // For admin reference or LLM cross-check
});

module.exports = mongoose.model('Task', taskSchema);
