const express = require('express');
const router = express.Router();
const { registerTeacher, dashboarddata, tabulardata ,declareResult,teacherdata} = require('../controllers/admin.js');
const { restrictedtoadminonly } = require('../middleware/adminauth.js');
const { route } = require('./static.js');



router.get('/', restrictedtoadminonly, dashboarddata)
router.get('/allteacher', restrictedtoadminonly, teacherdata);
router.get('/tabulardata', restrictedtoadminonly, tabulardata);
router.post('/addteacher', restrictedtoadminonly, registerTeacher);
router.post('/declareresult', restrictedtoadminonly, declareResult);

module.exports = router;