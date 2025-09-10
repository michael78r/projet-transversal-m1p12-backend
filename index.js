const express = require('express');
const cors = require('cors');
const { connectDB, connectPostgres } = require('./config/db');
require('dotenv').config();

const app = express();

// Connect to databases
connectDB();
connectPostgres();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('API is running...');
});

// Define routes here

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
