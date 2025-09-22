const mongoose = require("mongoose");

const usageLogsSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true  // This already creates an index, so no need for explicit index
    },

    // Plan Information
    planType: {
        type: String,
        enum: ['Explorer', 'Scholar', 'Achiever'],
        required: true,
        default: 'Explorer'
    },

    planExpiresAt: {
        type: Date,
        required: true
    },

    // Feature Usage - Based on your membership plans
    ytSummary: {
        type: Number,
        default: 0,
        min: 0
    },

    quiz: {
        type: Number,
        default: 0,
        min: 0
    },

    chatbot: {
        type: Number,
        default: 0,
        min: 0
    },

    mindmap: {
        type: Number,
        default: 0,
        min: 0
    },

    p2pDoubt: {
        type: Boolean,
        default: false
    },

    joinQuiz: {
        type: Boolean,
        default: true
    },

    modelselect: {
        type: Boolean,
        default: false
    },

    difficultychoose: {
        type: Boolean,
        default: false
    },

    // Optional: Track when plan was last renewed
    planRenewedAt: {
        type: Date,
        default: Date.now
    },

    // Optional: Store original limits for reference
    originalLimits: {
        ytSummary: { type: Number, default: 0 },
        quiz: { type: Number, default: 0 },
        chatbot: { type: Number, default: 0 },
        mindmap: { type: Number, default: 0 },
        p2pDoubt: { type: Boolean, default: false },
        joinQuiz: { type: Boolean, default: true },
        modelselect: { type: Boolean, default: false },
        difficultychoose: { type: Boolean, default: false }
    }
}, { timestamps: true }); // This automatically adds createdAt and updatedAt

// Indexes for better performance (removed duplicate userId index)
usageLogsSchema.index({ planExpiresAt: 1 });
usageLogsSchema.index({ planType: 1 });

// Instance method to check if plan is expired
usageLogsSchema.methods.isPlanExpired = function () {
    return new Date(this.planExpiresAt) < new Date();
};

// Instance method to reset usage limits (useful for plan renewal)
usageLogsSchema.methods.resetUsageLimits = function (limits) {
    this.ytSummary = limits.ytSummary || 0;
    this.quiz = limits.quiz || 0;
    this.chatbot = limits.chatbot || 0;
    this.mindmap = limits.mindmap || 0;
    this.p2pDoubt = limits.p2pDoubt || false;
    this.joinQuiz = limits.joinQuiz || true;
    this.modelselect = limits.modelselect || false;
    this.difficultychoose = limits.difficultychoose || false;
    this.updatedAt = new Date();
    this.planRenewedAt = new Date();
};

// Static method to create usage record for new user
usageLogsSchema.statics.createForUser = function (userId, planType = 'Explorer', expirationDate = null) {
    const planLimits = this.getPlanLimits(planType);
    const expiresAt = expirationDate || new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)); // 30 days from now

    return this.create({
        userId,
        planType,
        planExpiresAt: expiresAt,
        originalLimits: planLimits,
        ...planLimits
    });
};

// Static method to get plan limits based on plan type
usageLogsSchema.statics.getPlanLimits = function (planType) {
    const limits = {
        Explorer: {
            ytSummary: 3,
            quiz: 0,
            chatbot: 0,
            mindmap: 0,
            p2pDoubt: false,
            joinQuiz: true,
            modelselect: false,
            difficultychoose: false
        },
        Scholar: {
            ytSummary: 10,
            quiz: 10,
            chatbot: 7,
            mindmap: 7,
            p2pDoubt: true,
            joinQuiz: true,
            modelselect: true,
            difficultychoose: false
        },
        Achiever: {
            ytSummary: Number.MAX_SAFE_INTEGER, // Unlimited
            quiz: Number.MAX_SAFE_INTEGER, // Unlimited
            chatbot: Number.MAX_SAFE_INTEGER, // Unlimited
            mindmap: Number.MAX_SAFE_INTEGER, // Unlimited
            p2pDoubt: true,
            joinQuiz: true,
            modelselect: true,
            difficultychoose: true
        }
    };

    return limits[planType] || limits.Explorer;
};

const UsageLogs = mongoose.model("UsageLogs", usageLogsSchema);

module.exports = UsageLogs;