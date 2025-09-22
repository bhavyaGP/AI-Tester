const mongoose = require("mongoose");

const doubtSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "student",
    required: true,
  },
  assignedTeacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "teacher",
    default: null, 
  },
  matchedTeachers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "teacher",
    },
  ],
  imageId: {
    type: String,
    required: true,
    unique: true,
  },
  pending: {
    type: Boolean,
    default: true,
  },
  status: {
    type: String,
    enum: ["pending", "assigned", "inprogress", "resolved"],
    default: "pending",
  },
  name: {
    type: String,
    required: true,
  },
  topics: {
    type: [String],
    default: [],
  },
  priority: {
    type: String,
    enum: ["low", "medium", "high"],
    default: "medium",
  },
  messages: [
    {
      sender: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: "senderModel",
      },
      senderModel: {
        type: String,
        enum: ["student", "teacher"],
      },
      message: String,
      timestamp: {
        type: Date,
        default: Date.now,
      },
    },
  ],
}, { timestamps: true });

// Indexing for faster lookups
doubtSchema.index({ topics: 1 });
doubtSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Doubt", doubtSchema);




// {
//   "_id": "656a1f3e5b4e6c001f234567",
//   "student": {
//     "_id": "656a1d2b3c4f5d001e123456",
//     "name": "Aryan Patel",
//     "email": "aryan.patel@example.com"
//   },
//   "assignedTeacher": {
//     "_id": "656a1e4d5b4e6c001f987654",
//     "name": "Prof. Mehta",
//     "subject": "Mathematics",
//     "expertise": "Algebra"
//   },
//   "matchedTeachers": [
//     {
//       "_id": "656a1e5d6b4e7c002a567890",
//       "name": "Dr. Sharma",
//       "subject": "Mathematics",
//       "expertise": "Algebra"
//     },
//     {
//       "_id": "656a1e6d7b4e8c003b678901",
//       "name": "Ms. Rathi",
//       "subject": "Mathematics",
//       "expertise": "Linear Equations"
//     }
//   ],
//   "imageId": "f2c8e7a9-1234-4567-89ab-abcdef123456",
//   "pending": false,
//   "status": "assigned",
//   "name": "Solving Quadratic Equations",
//   "topics": ["Mathematics", "Algebra"],
//   "priority": "high",
//   "messages": [
//     {
//       "sender": "656a1d2b3c4f5d001e123456",
//       "senderModel": "student",
//       "message": "How do I solve x² - 5x + 6 = 0?",
//       "timestamp": "2025-02-01T10:15:30.000Z"
//     },
//     {
//       "sender": "656a1e4d5b4e6c001f987654",
//       "senderModel": "teacher",
//       "message": "You can factor it as (x - 2)(x - 3) = 0.",
//       "timestamp": "2025-02-01T10:16:00.000Z"
//     },
//     {
//       "sender": "656a1d2b3c4f5d001e123456",
//       "senderModel": "student",
//       "message": "So x = 2 or x = 3, right?",
//       "timestamp": "2025-02-01T10:16:30.000Z"
//     }
//   ],
//   "createdAt": "2025-02-01T10:10:00.000Z",
//   "updatedAt": "2025-02-01T10:16:30.000Z"
// }
