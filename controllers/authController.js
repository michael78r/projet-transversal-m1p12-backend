
const { getDB } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config');

// Register a new user
exports.register = async (req, res, next) => {
  try {
    const db = getDB();
    const { email, password, role, name } = req.body;

    // Check if user already exists
    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert new user
    const result = await db.collection('users').insertOne({
      email,
      password: hashedPassword,
      role,
      name,
      createdAt: new Date(),
    });

    res.status(201).json({ message: 'User registered successfully', userId: result.insertedId });
  } catch (error) {
    next(error);
  }
};

// Login user
exports.login = async (req, res, next) => {
  try {
    const db = getDB();
    const { email, password } = req.body;

    // Find user by email
    const user = await db.collection('users').findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Authentication failed. User not found.' });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Authentication failed. Wrong password.' });
    }

    const payload = { id: user._id, role: user.role };
    const token = jwt.sign(payload, jwtSecret, {
      expiresIn: '1h', // Note: The token expiration was updated in a later step
    });

    res.json({ token: `Bearer ${token}` });
  } catch (error) {
    next(error);
  }
};
