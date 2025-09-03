const express = require('express');
const router = express.Router();
const adv = require('../controller/student.advanced.controller');

// Grouped advanced endpoints for students
router.get('/search', adv.search);
router.get('/count', adv.count);
router.get('/recent', adv.recent);
router.post('/bulk', adv.bulk);
router.get('/surname/:surname', adv.bySurname);

module.exports = router;
