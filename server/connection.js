require('dotenv').config();
const mongoose = require('mongoose');
const mongoUrl = process.env.mongoUrl || "mongodb://localhost:27017/playpower";

mongoose.set('strictQuery', true);

mongoose.connect(mongoUrl, {
    serverSelectionTimeoutMS: 30000,
});

const db = mongoose.connection;

db.on('connected', () => {
    console.log('✅Connected to MongoDB');
});
db.on('error', (err) => {
    console.error('Error connecting to MongoDB', err);
});
db.on('disconnected', () => {
    console.log('Disconnected from MongoDB');
});

module.exports = db; 
