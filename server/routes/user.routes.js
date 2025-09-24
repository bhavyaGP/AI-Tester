const express = require('express');
const router = express.Router();

const { storestatics, getstatistics, uploadFile, upload, giveratingtoteacher, getdoubthistory } = require('../controller/student.controller');
const {
    verifyUser
} = require('../middleware/auth.middleware');
const { createOrder, verifyPayment } = require('../controller/payment.controller');


router.get('/showhistory', verifyUser, getstatistics);
router.post('/upload', verifyUser, upload.single('image'), uploadFile);
router.post('/rating', verifyUser, giveratingtoteacher);
router.get('/doubthistory', verifyUser, getdoubthistory);
router.post('/api/payment', verifyUser, createOrder);
router.post('/api/verifypayment', verifyUser, verifyPayment);

module.exports = router;    