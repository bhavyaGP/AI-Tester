const studentService = require('../services/student.service');

const adv = {};

adv.search = async (req, res) => {
    try {
        const q = req.query.q || '';
        const results = await studentService.search(q);
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

adv.count = async (req, res) => {
    try {
        const total = await studentService.count();
        res.json({ count: total });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

adv.recent = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 5;
        const list = await studentService.recent(limit);
        res.json(list);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

adv.bulk = async (req, res) => {
    try {
        const list = req.body;
        if (!Array.isArray(list)) return res.status(400).json({ error: 'Expected an array' });
        const created = await studentService.bulkCreate(list);
        res.json({ inserted: created.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

adv.bySurname = async (req, res) => {
    try {
        const surname = req.params.surname || '';
        const found = await studentService.findBySurname(surname);
        res.json(found);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = adv;
