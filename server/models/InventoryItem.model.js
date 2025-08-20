const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema({
  itemId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  cost: { type: Number, required: true },
  effect: { type: String },
});

module.exports = mongoose.model('InventoryItem', inventoryItemSchema); 