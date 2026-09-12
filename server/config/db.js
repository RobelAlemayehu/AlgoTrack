const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
        if (!mongoUri) {
            console.error('ERROR: Neither MONGODB_URI nor MONGO_URI is set in environment variables.');
            console.error('Please configure MONGODB_URI or MONGO_URI in your environment settings (e.g. Render Dashboard).');
            process.exit(1);
        }
        const conn = await mongoose.connect(mongoUri);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.log(`Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;