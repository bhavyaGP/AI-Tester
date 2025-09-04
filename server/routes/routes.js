const express = require('express');
const router = express.Router();

const sc = require('../controller/student.controller')

router.get('/', sc.getStudents);
router.post('/', sc.createStudent);
router.get('/:id', sc.getStudent);
router.put('/:id', sc.editStudent);
router.delete('/:id', sc.deleteStudent);

module.exports = router;