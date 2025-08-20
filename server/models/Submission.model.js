const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  levelId: { type: Number, required: true },
  submittedAnswer: { type: String, required: true },
  isCorrect: { type: Boolean, required: true },
  time: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Submission', submissionSchema); 