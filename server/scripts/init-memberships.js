const mongoose = require('mongoose');
const Membership = require('../models/membership.model');
require('dotenv').config();

async function initializeMemberships() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    } catch (error) {
        console.error('Error initializing memberships:', error);
    }
}

initializeMemberships();