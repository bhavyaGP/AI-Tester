const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  tools: { type: [String], default: [] },
});

module.exports = mongoose.model('Inventory', inventorySchema); 