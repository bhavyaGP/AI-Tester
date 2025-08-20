const InventoryItem = require('../models/InventoryItem.model');
const StoreItem = require('../models/StoreItem.model');
const User = require('../models/user.model');

exports.getPlayerInventory = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json(user.inventory || []);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
};

exports.buyItem = async (req, res) => {
  try {
    const { itemId } = req.body;
    const user = await User.findById(req.user._id);
    const item = await StoreItem.findOne({ itemId });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (user.coins < item.cost) return res.status(400).json({ error: 'Not enough coins' });
    user.coins -= item.cost;
    const invIdx = user.inventory.findIndex(i => i.item === itemId);
    if (invIdx > -1) {
      user.inventory[invIdx].qty += 1;
    } else {
      user.inventory.push({ item: itemId, qty: 1 });
    }
    await user.save();
    res.json({ message: 'Item bought', coins: user.coins, inventory: user.inventory });
  } catch (err) {
    res.status(500).json({ error: 'Failed to buy item' });
  }
};

exports.sellItem = async (req, res) => {
  try {
    const { itemId } = req.body;
    const user = await User.findById(req.user._id);
    const item = await StoreItem.findOne({ itemId });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    const invIdx = user.inventory.findIndex(i => i.item === itemId);
    if (invIdx === -1 || user.inventory[invIdx].qty < 1) return res.status(400).json({ error: 'Item not in inventory' });
    user.inventory[invIdx].qty -= 1;
    user.coins += Math.floor(item.cost * 0.5);
    if (user.inventory[invIdx].qty === 0) user.inventory.splice(invIdx, 1);
    await user.save();
    res.json({ message: 'Item sold', coins: user.coins, inventory: user.inventory });
  } catch (err) {
    res.status(500).json({ error: 'Failed to sell item' });
  }
};
