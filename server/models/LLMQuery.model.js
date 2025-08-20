const mongoose = require('mongoose');

const llmQuerySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  levelId: { type: Number },
  type: { type: String, required: true }, // e.g., 'hint', 'explanation', 'ask'
  query: { type: String, required: true },
  response: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('LLMQuery', llmQuerySchema); 