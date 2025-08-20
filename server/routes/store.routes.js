const express = require('express');
const router = express.Router();
const shopController = require('../controllers/shop.controller');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware, shopController.getStoreItems);

module.exports = router; 