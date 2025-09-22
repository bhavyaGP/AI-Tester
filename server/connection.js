require('dotenv').config();
const mongoose = require('mongoose');

mongoose.set('strictQuery', true);

const uri = process.env.mongoUrl || process.env.mongoUrl;

mongoose.connect(uri)
    .then(() => console.log('✅Connected to MongoDB'))
    .catch((err) => console.error('Error connecting to MongoDB', err));

const db = mongoose.connection;

db.on('connected', () => {
    console.log('✅MongoDB connection event: connected');
});

db.on('error', (err) => {
    console.error('MongoDB connection event: error', err);
});

db.on('disconnected', () => {
    console.log('MongoDB connection event: disconnected');
});

module.exports = db;
