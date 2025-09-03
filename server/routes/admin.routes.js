const express = require('express');
const router = express.Router();
const admin = require('../controller/admin.controller');
const logger = require('../middleware/request.logger');

// Admin endpoints - protected in a real app, here for debugging and dev
router.use(logger);

router.get('/stats', admin.stats);
router.get('/export', admin.exportCsv);
router.post('/import', admin.importCsv);
router.post('/seed', admin.seed);
router.post('/clear', admin.clear);

module.exports = router;
