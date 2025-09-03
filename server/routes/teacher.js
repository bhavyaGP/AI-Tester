const express = require('express');
const multer = require('multer');
const { HandleTeacherLogin, getReport, addstudent, addmarks, showsAllStudents, addactivitymarks, teacherdashboarddata, teachertabulardata, addachivement, updatemarks, allachivement, deletestudent, updatestudent,getallMarks } = require('../controllers/teacher.js');
const { authenticateTeacher } = require('../middleware/authteacher.js');
const { restrictedtoadminonly } = require('../middleware/adminauth.js');
const { authenticateTeacherOrAdmin } = require('../middleware/adminorteacher.js');
const checkResultDeclared = require('../middleware/checkResultDeclared.js')
const { route } = require('./static.js');
const router = express.Router();
const upload = multer({ dest: 'uploads/' });
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./uploads");
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});


router.get("/", (req, res) => {
    return res.send("Welcome to the teacher homepage");
});
router.get("/uploadfile", authenticateTeacher, (req, res) => {
    return res.render("homepage");
});

router.get("/marks", authenticateTeacher, (req, res) => {
    return res.render("addmarks");
});

router.get("/activitymarks", authenticateTeacher, (req, res) => {
    return res.render("addactivitymarks");
});




// Protected routes
router.get('/report', authenticateTeacher, checkResultDeclared, getReport);
router.post('/addstudent', authenticateTeacher, upload.single("excelFile"), addstudent);
router.post('/uploadmarks', authenticateTeacher, upload.single("excelFile"), addmarks);
router.get('/allstudent', authenticateTeacher, showsAllStudents);
router.post('/activitymarks', authenticateTeacher, upload.single("excelFile"), addactivitymarks);
router.get('/dashboarddata', authenticateTeacherOrAdmin, teacherdashboarddata);
router.get('/tabulardata', authenticateTeacherOrAdmin, teachertabulardata);
router.post('/addachivement', authenticateTeacher, addachivement);
router.post('/updatemarks', authenticateTeacher, updatemarks);
router.get('/allachivement', authenticateTeacherOrAdmin, allachivement);
router.post('/updatestudent', authenticateTeacher, updatestudent);
router.delete('/deletestudent', authenticateTeacher, deletestudent);
router.get("/getallmarks", authenticateTeacher, getallMarks);

module.exports = router;
