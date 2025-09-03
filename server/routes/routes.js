const express = require('express');
const router = express.Router();

const sc = require('../controller/student.controller')
const Student = require('../models/students');
// Mount advanced routes
const advanced = require('./advanced.routes');

router.get('/', sc.getStudents);
router.post('/', sc.createStudent);
router.get('/:id', sc.getStudent);
router.put('/:id', sc.editStudent);
router.delete('/:id', sc.deleteStudent);

// Search students by name or surname (query param: q)
router.get('/search', async (req, res) => {
	try {
		const q = req.query.q || '';
		const re = new RegExp(q, 'i');
		const results = await Student.find({ $or: [{ name: re }, { surname: re }] });
		res.json(results);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// Get total number of students
router.get('/count', async (req, res) => {
	try {
		const total = await Student.countDocuments();
		res.json({ count: total });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// Get recent students (based on ObjectId timestamp). Query param: limit (default 5)
router.get('/recent', async (req, res) => {
	try {
		const limit = parseInt(req.query.limit) || 5;
		const recent = await Student.find().sort({ _id: -1 }).limit(limit);
		res.json(recent);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// Bulk create students: accepts an array of {name, surname} in request body
router.post('/bulk', async (req, res) => {
	try {
		const list = req.body;
		if (!Array.isArray(list)) return res.status(400).json({ error: 'Expected an array of students' });
		const docs = list.map(s => ({ name: s.name, surname: s.surname }));
		const created = await Student.insertMany(docs);
		res.json({ inserted: created.length });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// Find students by exact surname (case-insensitive)
router.get('/surname/:surname', async (req, res) => {
	try {
		const surname = req.params.surname || '';
		const re = new RegExp('^' + surname + '$', 'i');
		const found = await Student.find({ surname: re });
		res.json(found);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

module.exports = router;

// also export advanced router for mounting by server index if needed
module.exports.advanced = advanced;