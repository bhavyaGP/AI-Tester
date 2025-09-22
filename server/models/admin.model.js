const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['admin'],
        default: 'admin'
    },
    permissions: [{
        type: String, 
        enum: ['manage_teachers', 'manage_students', 'manage_content', 'view_analytics', 'manage_payments', 'manage_memberships']
    }],
    teacherRequests: [{
        teacherId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Teacher'
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending'
        },
        requestDate: {
            type: Date,
            default: Date.now
        },
        actionDate: Date,
        actionBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admin'
        }
    }]
}, { timestamps: true });

const Admin = mongoose.model('Admin', adminSchema);
module.exports = Admin;