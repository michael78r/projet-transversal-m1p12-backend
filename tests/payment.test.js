const request = require('supertest');
const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');
const { connectDB, getDB, closeDB } = require('../config/db');
const paymentRoutes = require('../routes/paymentRoutes');
const errorHandler = require('../middlewares/errorHandler');
const { jwtSecret } = require('../config');

const app = express();
let server;
let clientUser, testRequest;
let clientToken;

beforeAll(async () => {
  process.env.MONGO_URI = process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/test-payment-db';
  await connectDB();
  
  app.use(express.json());
  app.use(passport.initialize());
  require('../config/passport')(passport);
  app.use('/api/payments', paymentRoutes);
  app.use(errorHandler);
  server = app.listen(4007);

  const db = getDB();
  // Create users and a request
  const clientResult = await db.collection('users').insertOne({ name: 'Payment Client', email: 'pay.client@example.com', role: 'client' });
  clientUser = { _id: clientResult.insertedId, role: 'client' };
  clientToken = jwt.sign({ id: clientUser._id, role: clientUser.role }, jwtSecret);

  const requestResult = await db.collection('requests').insertOne({
    client: clientUser._id,
    prestataire: new ObjectId(),
    details: { budget: 15000 } // Set a budget for the payment
  });
  testRequest = { _id: requestResult.insertedId };
});

afterAll(async () => {
  const db = getDB();
  await db.dropDatabase();
  await closeDB();
  server.close();
});

beforeEach(async () => {
  const db = getDB();
  await db.collection('payments').deleteMany({});
});

describe('Payment Routes', () => {
  describe('POST /api/payments/initiate', () => {
    it('should initiate a payment and create a pending payment document', async () => {
      const res = await request(app)
        .post('/api/payments/initiate')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          requestId: testRequest._id.toString(),
          currency: 'MGA'
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('clientSecret');
      expect(res.body).toHaveProperty('paymentId');

      // Check DB for pending payment
      const db = getDB();
      const payment = await db.collection('payments').findOne({ _id: new ObjectId(res.body.paymentId) });
      expect(payment).not.toBeNull();
      expect(payment.status).toBe('pending');
      expect(payment.amount).toBe(15000);
    });
  });

  describe('POST /api/payments/webhook', () => {
    it('should handle a successful payment webhook and update the payment status', async () => {
      // 1. Initiate a payment to get a paymentIntentId
      const db = getDB();
      const paymentIntentId = 'pi_test_' + Date.now();
      await db.collection('payments').insertOne({
        request: testRequest._id,
        amount: 15000,
        currency: 'MGA',
        status: 'pending',
        paymentIntentId: paymentIntentId
      });

      // 2. Simulate the webhook call from the payment provider
      const webhookPayload = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: paymentIntentId,
            // ... other data from provider
          }
        }
      };

      const res = await request(app)
        .post('/api/payments/webhook')
        .send(webhookPayload);

      expect(res.statusCode).toEqual(200);
      expect(res.body.received).toBe(true);

      // 3. Verify the payment status is updated in the DB
      const updatedPayment = await db.collection('payments').findOne({ paymentIntentId: paymentIntentId });
      expect(updatedPayment.status).toBe('succeeded');
    });
  });
});
