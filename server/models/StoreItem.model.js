const mongoose = require('mongoose');

const storeItemSchema = new mongoose.Schema({
  itemId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  cost: { type: Number, required: true },
  type: { type: String, required: true },
});

module.exports = mongoose.model('StoreItem', storeItemSchema); 