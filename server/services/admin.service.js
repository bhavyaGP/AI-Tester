const Student = require('../models/students');
const csvUtil = require('../utils/csvExporter');

/**
 * Admin service - aggregation and bulk operations for students.
 * Keeps database related logic separate from controllers.
 */
const adminService = {
    async stats() {
        // total students
        const total = await Student.countDocuments();

        // top surnames (aggregation)
        const topSurnames = await Student.aggregate([
            { $match: { surname: { $exists: true, $ne: null } } },
            { $group: { _id: '$surname', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        // distribution by first letter of name
        const distribution = await Student.aggregate([
            { $match: { name: { $exists: true, $ne: null } } },
            { $project: { first: { $substrCP: ['$name', 0, 1] } } },
            { $group: { _id: { $toUpper: '$first' }, count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);

        return { total, topSurnames, distribution };
    },

    async exportCsv(filter = {}) {
        const docs = await Student.find(filter).lean();
        // pick common fields
        const fields = ['_id', 'name', 'surname'];
        return csvUtil.objectsToCsv(docs, fields);
    },

    async importCsv(text) {
        const rows = csvUtil.csvToObjects(text);
        // simple validation: only keep objects with at least a name
        const toInsert = rows
            .map(r => ({ name: (r.name || '').trim(), surname: (r.surname || '').trim() }))
            .filter(r => r.name);
        if (toInsert.length === 0) return { inserted: 0 };
        const created = await Student.insertMany(toInsert);
        return { inserted: created.length };
    },

    async seed(count = 20) {
        const samples = [];
        const surnames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
        for (let i = 0; i < count; i++) {
            samples.push({ name: `Student${Date.now().toString().slice(-4)}_${i}`, surname: surnames[i % surnames.length] });
        }
        const created = await Student.insertMany(samples);
        return { inserted: created.length };
    },

    async clearAll() {
        const res = await Student.deleteMany({});
        return { deletedCount: res.deletedCount };
    }
};

module.exports = adminService;
