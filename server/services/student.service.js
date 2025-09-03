const Student = require('../models/students');

// Small service layer for student-related DB operations
const studentService = {
    async search(q) {
        const re = new RegExp(q || '', 'i');
        return Student.find({ $or: [{ name: re }, { surname: re }] });
    },

    async count() {
        return Student.countDocuments();
    },

    async recent(limit = 5) {
        return Student.find().sort({ _id: -1 }).limit(limit);
    },

    async bulkCreate(list = []) {
        const docs = list.map(s => ({ name: s.name, surname: s.surname }));
        return Student.insertMany(docs);
    },

    async findBySurname(surname) {
        const re = new RegExp('^' + (surname || '') + '$', 'i');
        return Student.find({ surname: re });
    }
};

module.exports = studentService;
