const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({
    doubtId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Doubt",
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    message: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model("Chat", chatSchema);
