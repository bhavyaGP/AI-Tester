const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
    avatar: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true
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
    phone: {
        type: String, 
        required: true
    },
    highestQualification: {
        type: String,
        required: true
    },
    experience: {
        type: Number,
        required: true
    },
    specialization: {
        type: String,
        default: ""
    },
    bio: {
        type: String,
        default: ""
    },
    subject: [
        {
            field: String, 
            subcategory: [String] 
        }
    ],
    certification: {
        type: [String],
        required: true
    },
    rating: {
        type: Number,
        default: 0
    },
    doubtsSolved: {
        type: Number,
        default: 0 
    },
    isOnline: {
        type: Boolean,
        default: false 
    },
    approvalStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    availability: [
        {
            day: String, 
            startTime: String, 
            endTime: String
        }
    ]
}, { timestamps: true });

// Index for faster queries
teacherSchema.index({ "subject.field": 1, "subject.subcategory": 1 });
teacherSchema.index({ "approvalStatus": 1 });

const Teacher = mongoose.model('Teacher', teacherSchema);
module.exports = Teacher;




// {
//     "_id": "656a1f3e5b4e6c001f234567",
//     "avatar": "https://example.com/avatars/teacher123.jpg",
//     "username": "Prof. Mehta",
//     "email": "mehta.prof@example.com",
//     "password": "$2b$10$xyzHashedPasswordHere", 
//     "phone": "+91-9876543210",
//     "highestQualification": "Ph.D. in Mathematics",
//     "experience": 12,
//     "specialization": "Algebra & Calculus",
//     "bio": "Passionate mathematics professor with over 12 years of teaching experience in Algebra and Calculus.",
//     "subject": [
//       {
//         "field": "Mathematics",
//         "subcategory": ["Algebra", "Calculus", "Linear Equations"]
//       }
//     ],
//     "certification": [
//       "Certified Math Educator - National Board",
//       "Advanced Algebra Teaching Certification"
//     ],
//     "rating": 4.8,
//     "doubtsSolved": 156,
//     "isOnline": true,
//     "approvalStatus": "approved",
//     "availability": [
//       {
//         "day": "Monday",
//         "startTime": "09:00 AM",
//         "endTime": "06:00 PM"
//       },
//       {
//         "day": "Wednesday",
//         "startTime": "10:00 AM",
//         "endTime": "05:00 PM"
//       }
//     ],
//     "createdAt": "2025-02-01T10:00:00.000Z",
//     "updatedAt": "2025-02-01T14:30:00.000Z"
//   }
