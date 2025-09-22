const mongoose = require('mongoose');

const membershipSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['Explorer', 'Scholar', 'Achiever'],
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    duration: {
        type: Number,
        default: 30, // days because per month,
        required: true
    },
    features: {
        ytSummary: {
            type: Number,
            required: true
        },
        quiz: {
            type: Number,
            required: true
        },
        chatbot: {
            type: Number,
            required: true
        },
        mindmap: {
            type: Number,
            required: true
        },
        p2pDoubt: {
            type: Boolean,
            required: true
        },
        joinQuiz: {
            type: Boolean,
            required: true
        },
        modelselect: {
            type: Boolean,
            required: true
        },
        difficultychoose: {
            type: Boolean,
            required: true
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    displayOrder: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

// Add initial membership data
membershipSchema.statics.initializeMemberships = async function() {
    const memberships = [
        {
            type: 'Explorer',
            price: 0,
            duration: 30,
            features: {
                ytSummary: 3,
                quiz: 0,
                chatbot: false,
                mindmap: false,
                p2pDoubt: false,
                joinQuiz: true,
                modelselect: false,
                difficultychoose: false
            },
            displayOrder: 1
        },
        {
            type: 'Scholar',
            price: 49,
            duration: 30,
            features: {
                ytSummary: 10,
                quiz: 10,
                chatbot: 7,
                mindmap: 7,
                p2pDoubt: true,
                joinQuiz: true,
                modelselect: true,
                difficultychoose: false
            },
            displayOrder: 2
        },
        {
            type: 'Achiever',
            price: 99,
            duration: 30,
            features: {
                ytSummary: 15,
                quiz: 15,
                chatbot: 10,
                mindmap: 10,
                p2pDoubt: true,
                joinQuiz: true,
                modelselect: true,
                difficultychoose: true
            },
            displayOrder: 3
        }
    ];

    for (const membership of memberships) {
        await this.findOneAndUpdate(
            { type: membership.type },
            membership,
            { upsert: true }
        );
    }
};

const Membership = mongoose.model('Membership', membershipSchema);
module.exports = Membership;

