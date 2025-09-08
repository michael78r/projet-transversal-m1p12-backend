
const { getDB } = require('../config/db');
const { ObjectId } = require('mongodb');

// Get user profile
exports.getProfile = async (req, res, next) => {
  try {
    const db = getDB();
    // req.user is populated by Passport JWT strategy
    const userId = new ObjectId(req.user._id);

    const user = await db.collection('users').findOne(
      { _id: userId },
      { projection: { password: 0 } } // Exclude password from the result
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
};

// Update user profile
exports.updateProfile = async (req, res, next) => {
  try {
    const db = getDB();
    const userId = new ObjectId(req.user._id);
    const { name, profile } = req.body; // Only allow updating specific fields

    const updateData = {
        $set: {
            ...(name && { name }),
            ...(profile && { profile }),
            updatedAt: new Date()
        }
    };

    const result = await db.collection('users').findOneAndUpdate(
      { _id: userId },
      updateData,
      { 
        returnDocument: 'after', // Return the updated document
        projection: { password: 0 } // Exclude password
      }
    );

    if (!result.value) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(result.value);
  } catch (error) {
    next(error);
  }
};
