const express = require('express');
const router = express.Router();
const shopController = require('../controllers/shop.controller');
const authMiddleware = require('../middleware/authMiddleware');

// List all shop items
router.get('/', authMiddleware, shopController.listItems);

// Buy a shop item
router.post('/buy', authMiddleware, shopController.buyItem);

module.exports = router; 