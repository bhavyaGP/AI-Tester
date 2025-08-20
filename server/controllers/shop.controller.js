const ShopItem = require("../models/ShopItem.model");
const Inventory = require("../models/Inventory.model");
const StoreItem = require('../models/StoreItem.model');

exports.listItems = async (req, res) => {
  try {
    const items = await ShopItem.find();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch shop items' });
  }
};

exports.buyItem = async (req, res) => {
  try {
    const { itemId } = req.body;
    const item = await ShopItem.findById(itemId);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    let inventory = await Inventory.findOne({ user: req.user._id });
    if (!inventory) {
      inventory = new Inventory({ user: req.user._id, tools: [] });
    }

    if (!inventory.tools.includes(item.name)) {
      inventory.tools.push(item.name);
      await inventory.save();
    }

    res.json({ message: "Item bought successfully", tools: inventory.tools });
  } catch (err) {
    res.status(500).json({ error: 'Failed to buy item' });
  }
};

exports.getStoreItems = async (req, res) => {
  try {
    const items = await StoreItem.find();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch store items' });
  }
};
