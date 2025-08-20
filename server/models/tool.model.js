const mongoose = require('mongoose');

const toolSchema = new mongoose.Schema({
  toolId: { type: String, required: true, unique: true },
  name: String,
  description: String,
  unlockLevel: Number,
});

module.exports = mongoose.model('Tool', toolSchema);