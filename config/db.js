const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

let db;

const connectDB = async () => {
  try {
    await client.connect();
    db = client.db(); // You can specify a database name here, e.g., client.db("your_db_name")
    console.log('MongoDB connected successfully using native driver.');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

const getDB = () => {
  if (!db) {
    throw new Error('Database not initialized! Call connectDB first.');
  }
  return db;
};

const closeDB = async () => {
    if (client) {
        await client.close();
    }
};

module.exports = { connectDB, getDB, closeDB };