const adminService = require('../services/admin.service');

const admin = {};

admin.stats = async (req, res) => {
    try {
        const data = await adminService.stats();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

admin.exportCsv = async (req, res) => {
    try {
        const csv = await adminService.exportCsv();
        res.setHeader('Content-Type', 'text/csv');
        res.send(csv);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

admin.importCsv = async (req, res) => {
    try {
        const text = req.body && req.body.csv;
        if (!text) return res.status(400).json({ error: 'Expected csv text in body.csv' });
        const result = await adminService.importCsv(text);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

admin.seed = async (req, res) => {
    try {
        const count = parseInt(req.query.count) || 20;
        const result = await adminService.seed(count);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

admin.clear = async (req, res) => {
    try {
        const result = await adminService.clearAll();
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = admin;
