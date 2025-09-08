
const { getDB } = require('../config/db');
const { ObjectId } = require('mongodb');

// Create a new request for a service
exports.createRequest = async (req, res, next) => {
  try {
    const db = getDB();
    const { serviceId, details } = req.body;
    const clientId = new ObjectId(req.user._id);

    // 1. Find the service to get the prestataire's ID
    const service = await db.collection('services').findOne({ _id: new ObjectId(serviceId) });
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    // 2. Create the new request object
    const newRequest = {
      client: clientId,
      prestataire: service.prestataire, // Get prestataire from the service
      service: new ObjectId(serviceId),
      status: 'pending',
      details, // e.g., { lieu, duree, budget }
      createdAt: new Date(),
    };

    // 3. Insert the new request
    const result = await db.collection('requests').insertOne(newRequest);
    const insertedRequest = await db.collection('requests').findOne({ _id: result.insertedId });

    res.status(201).json(insertedRequest);
  } catch (error) {
    next(error);
  }
};

// Get all requests for the authenticated user (both as client and prestataire)
exports.getRequests = async (req, res, next) => {
  try {
    const db = getDB();
    const userId = new ObjectId(req.user._id);

    const requests = await db.collection('requests').find({
      $or: [{ client: userId }, { prestataire: userId }],
    }).toArray();
    
    res.json(requests);
  } catch (error) {
    next(error);
  }
};
