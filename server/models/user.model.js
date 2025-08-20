const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  level: { type: Number, default: 1 },
  coins: { type: Number, default: 0 },
  toolsUnlocked: [String], // e.g., ["multimeter"]
  inventory: [
    {
      item: String,
      qty: Number,
    }
  ],
  tasksCompleted: [String], // taskIds
  achievements: [String]
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
