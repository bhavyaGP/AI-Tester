const mongoose = require('mongoose');

const maintenanceSchema = new mongoose.Schema({
    isMaintenanceMode: {
        type: Boolean,
        default: false
    },
    message: {
        type: String,
        default: "The server is currently under maintenance. Please try again later."
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Ensure only one maintenance document exists
maintenanceSchema.statics.getMaintenanceStatus = async function() {
    let maintenance = await this.findOne({});
    if (!maintenance) {
        maintenance = new this({});
        await maintenance.save();
    }
    return maintenance;
};

maintenanceSchema.statics.updateMaintenanceStatus = async function(isMaintenanceMode, message, updatedBy) {
    let maintenance = await this.getMaintenanceStatus();
    maintenance.isMaintenanceMode = isMaintenanceMode;
    if (message) maintenance.message = message;
    maintenance.updatedBy = updatedBy;
    maintenance.updatedAt = new Date();
    await maintenance.save();
    return maintenance;
};

module.exports = mongoose.model('Maintenance', maintenanceSchema);
