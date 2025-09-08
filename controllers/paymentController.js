
const { getDB } = require('../config/db');
const { ObjectId } = require('mongodb');
const paymentService = require('../services/paymentService');

// Initiate a payment for a request
exports.initiatePayment = async (req, res, next) => {
  try {
    const db = getDB();
    const { requestId, currency } = req.body;
    const clientId = new ObjectId(req.user._id);

    // 1. Find the request to get the amount and ensure it belongs to the client
    const request = await db.collection('requests').findOne({
      _id: new ObjectId(requestId),
      client: clientId,
    });

    if (!request) {
      return res.status(404).json({ message: 'Request not found or does not belong to the user.' });
    }
    
    // For this example, let's assume the amount is in the request details
    const amount = request.details.budget;
    if (!amount) {
        return res.status(400).json({ message: 'Request does not have a budget defined.' });
    }

    // 2. Call the mock payment gateway service
    const paymentIntent = await paymentService.createPaymentIntent(amount, currency);

    // 3. Create a payment document in our DB
    const newPayment = {
      request: new ObjectId(requestId),
      amount,
      currency,
      paymentIntentId: paymentIntent.id, // Store the ID from the payment provider
      status: 'pending',
      createdAt: new Date(),
    };
    
    const result = await db.collection('payments').insertOne(newPayment);

    // 4. Return the client secret to the frontend to finalize payment
    res.json({ 
        clientSecret: paymentIntent.client_secret,
        paymentId: result.insertedId 
    });
  } catch (error) {
    next(error);
  }
};

// Handle webhook notifications from the payment gateway
exports.handleWebhook = async (req, res, next) => {
  try {
    const db = getDB();
    const event = req.body; // This would be the payload from the payment provider

    // Use the mock service to handle the webhook logic
    const { paymentIntentId, status } = await paymentService.handleWebhook(event);

    if (paymentIntentId && status) {
        // Update the payment status in our database
        await db.collection('payments').updateOne(
            { paymentIntentId: paymentIntentId },
            { $set: { status: status, updatedAt: new Date() } }
        );
    }
    
    res.status(200).json({ received: true });
  } catch (error) {
    // Don't send error details to the webhook caller for security
    console.error('Webhook error:', error);
    res.status(400).send('Webhook Error');
  }
};
