const { MongoClient } = require('mongodb');
const { Sequelize } = require('sequelize');
require('dotenv').config();

// MongoDB Configuration
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

// PostgreSQL Configuration
const sequelize = new Sequelize(process.env.PG_DATABASE, process.env.PG_USER, process.env.PG_PASSWORD, {
  host: process.env.PG_HOST,
  dialect: 'postgres'
});

const connectPostgres = async () => {
  try {
    await sequelize.authenticate();
    console.log('Connection to PostgreSQL has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to the PostgreSQL database:', error);
  }
};

module.exports = { connectDB, getDB, closeDB, sequelize, connectPostgres };