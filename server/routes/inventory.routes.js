const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory.controller');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware, inventoryController.getPlayerInventory);// Get the player's inventory
router.post('/buy', authMiddleware, inventoryController.buyItem); // Buy an item from the store
router.post('/sell', authMiddleware, inventoryController.sellItem);// Sell an item from the inventory

module.exports = router; 