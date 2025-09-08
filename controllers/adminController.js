
const { getDB } = require('../config/db');
const { ObjectId } = require('mongodb');

// Get all users
exports.getUsers = async (req, res, next) => {
  try {
    const db = getDB();
    const users = await db.collection('users').find({}, { projection: { password: 0 } }).toArray();
    res.json(users);
  } catch (error) {
    next(error);
  }
};

// Manage user (e.g., update status, role)
exports.manageUser = async (req, res, next) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const { ...updateFields } = req.body; // e.g., { isBanned: true, role: 'client' }

    const result = await db.collection('users').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateFields },
      { 
        returnDocument: 'after',
        projection: { password: 0 }
      }
    );

    if (!result.value) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User updated successfully', user: result.value });
  } catch (error) {
    next(error);
  }
};
