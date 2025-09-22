const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'student',
        required: true
    },
    membership: {
        type: String,
        enum: ['Explorer', 'Scholar', 'Achiever'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    duration: {
        type: Number,
        required: true
    },
    paymentDetails: {
        orderId: {
            type: String,
            required: true,
            unique: true
        },
        paymentId: {
            type: String,
            sparse: true // Allows null/undefined while maintaining uniqueness for non-null values
        },
        status: {
            type: String,
            enum: ['pending', 'completed', 'failed', 'refunded'],
            default: 'pending'
        },
        paymentMethod: {
            type: String,
            default: 'razorpay'
        }
    },
    validityPeriod: {
        startDate: Date,
        endDate: Date
    },
    features: {
        ytSummary: Number,
        quiz: Number,
        chatbot: Number,
        mindmap: Number,
        p2pDoubt: Boolean,
        joinQuiz: Boolean,
        modelselect: Boolean,
        difficultychoose: Boolean
    }
}, { timestamps: true });

// Indexes for faster queries
orderSchema.index({ "student": 1 });
orderSchema.index({ "paymentDetails.status": 1 });
orderSchema.index({ "createdAt": -1 });
orderSchema.index({ "membership": 1 });

// Static method to get total revenue
orderSchema.statics.getTotalRevenue = async function() {
    const result = await this.aggregate([
        {
            $match: {
                "paymentDetails.status": "completed"
            }
        },
        {
            $group: {
                _id: null,
                totalRevenue: { $sum: "$amount" },
                orderCount: { $sum: 1 }
            }
        }
    ]);
    return result[0] || { totalRevenue: 0, orderCount: 0 };
};

// Static method to get revenue by membership type
orderSchema.statics.getRevenueByMembership = async function() {
    return this.aggregate([
        {
            $match: {
                "paymentDetails.status": "completed"
            }
        },
        {
            $group: {
                _id: "$membership",
                revenue: { $sum: "$amount" },
                count: { $sum: 1 }
            }
        },
        {
            $sort: { revenue: -1 }
        }
    ]);
};

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;