/**
 * MongoDB Database Connection
 */

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    // Parse database name from URI for logging
    const dbName = mongoUri.split('/').pop().split('?')[0];
    
    const conn = await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`Database Name: ${dbName}`);
    console.log(`Collections: ${Object.keys(conn.connection.collections).join(', ') || 'None (new database)'}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    console.error('Please check:');
    console.error('1. MongoDB is running (mongod)');
    console.error('2. MONGODB_URI in .env is correct');
    console.error('3. Database name is unique (change it to avoid conflicts)');
    process.exit(1);
  }
};

module.exports = connectDB;

