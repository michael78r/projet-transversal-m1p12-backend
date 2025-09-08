
const { getDB } = require('../config/db');
const { ObjectId } = require('mongodb');

// Create a new service
exports.createService = async (req, res, next) => {
  try {
    const db = getDB();
    const { title, description, category, price } = req.body;
    
    const newService = {
      prestataire: new ObjectId(req.user._id),
      title,
      description,
      category,
      price,
      status: 'en cours', // default status
      createdAt: new Date(),
    };

    const result = await db.collection('services').insertOne(newService);
    
    // Fetch the inserted document to return it in the response
    const insertedService = await db.collection('services').findOne({ _id: result.insertedId });

    res.status(201).json(insertedService);
  } catch (error) {
    next(error);
  }
};

// Get all services for a prestataire
exports.getServices = async (req, res, next) => {
  try {
    const db = getDB();
    const prestataireId = new ObjectId(req.user._id);

    const services = await db.collection('services').find({ prestataire: prestataireId }).toArray();
    
    res.json(services);
  } catch (error) {
    next(error);
  }
};
