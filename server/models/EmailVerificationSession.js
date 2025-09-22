const mongoose = require('mongoose');

const emailVerificationSessionSchema = new mongoose.Schema({
    session: {
        type: String,
        required: true,
        unique: true
    },
    type: {
        type: String,
        required: true,
        enum: ['student', 'teacher', 'admin']
    },
    user: {
        type: Object,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 3600 // Expires after 1 hour
    }
});

module.exports = mongoose.model('EmailVerificationSession', emailVerificationSessionSchema);
