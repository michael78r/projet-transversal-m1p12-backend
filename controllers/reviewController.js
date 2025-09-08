
const { getDB } = require('../config/db');
const { ObjectId } = require('mongodb');

// Create a review for a completed request
exports.createReview = async (req, res, next) => {
  try {
    const db = getDB();
    const { requestId, rating, comment } = req.body;
    const clientId = new ObjectId(req.user._id);

    // 1. Find the request to ensure the user was the client and get prestataireId
    const request = await db.collection('requests').findOne({ 
      _id: new ObjectId(requestId),
      client: clientId 
    });

    if (!request) {
      return res.status(404).json({ message: 'Request not found or you are not the client for this request.' });
    }
    
    // Optional: Check if the request is completed before allowing a review
    // if (request.status !== 'completed') {
    //   return res.status(400).json({ message: 'You can only review completed requests.' });
    // }

    // 2. Create the new review
    const newReview = {
      client: clientId,
      prestataire: request.prestataire,
      request: new ObjectId(requestId),
      rating: Number(rating),
      comment,
      createdAt: new Date(),
    };

    const result = await db.collection('reviews').insertOne(newReview);
    const insertedReview = await db.collection('reviews').findOne({ _id: result.insertedId });

    res.status(201).json(insertedReview);
  } catch (error) {
    next(error);
  }
};

// Get all reviews for a specific prestataire
exports.getReviews = async (req, res, next) => {
  try {
    const db = getDB();
    const { prestataireId } = req.params;

    const reviews = await db.collection('reviews')
      .find({ prestataire: new ObjectId(prestataireId) })
      .toArray();
      
    res.json(reviews);
  } catch (error) {
    next(error);
  }
};
