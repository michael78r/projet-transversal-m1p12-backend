const request = require('supertest');
const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');
const { connectDB, getDB, closeDB } = require('../config/db');
const reviewRoutes = require('../routes/reviewRoutes');
const errorHandler = require('../middlewares/errorHandler');
const { jwtSecret } = require('../config');

const app = express();
let server;
let clientUser, prestataireUser, testRequest;
let clientToken, prestataireToken;

beforeAll(async () => {
  process.env.MONGO_URI = process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/test-review-db';
  await connectDB();
  
  app.use(express.json());
  app.use(passport.initialize());
  require('../config/passport')(passport);
  app.use('/api/reviews', reviewRoutes);
  app.use(errorHandler);
  server = app.listen(4005);

  const db = getDB();
  // Create users
  const clientResult = await db.collection('users').insertOne({ name: 'Review Client', email: 'rev.client@example.com', role: 'client' });
  clientUser = { _id: clientResult.insertedId, role: 'client' };
  clientToken = jwt.sign({ id: clientUser._id, role: clientUser.role }, jwtSecret);

  const presResult = await db.collection('users').insertOne({ name: 'Review Prestataire', email: 'rev.pres@example.com', role: 'prestataire' });
  prestataireUser = { _id: presResult.insertedId, role: 'prestataire' };
  prestataireToken = jwt.sign({ id: prestataireUser._id, role: prestataireUser.role }, jwtSecret);

  // Create a request linking the two users
  const requestResult = await db.collection('requests').insertOne({
    client: clientUser._id,
    prestataire: prestataireUser._id,
    service: new ObjectId(),
    status: 'completed' // Assuming a completed status
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
  await db.collection('reviews').deleteMany({});
});

describe('Review Routes', () => {
  describe('POST /api/reviews', () => {
    it('should be forbidden for a prestataire to create a review', async () => {
      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${prestataireToken}`)
        .send({ requestId: testRequest._id.toString(), rating: 5 });
      expect(res.statusCode).toEqual(403);
    });

    it('should allow a client to post a review for their request', async () => {
      const reviewData = {
        requestId: testRequest._id.toString(),
        rating: 5,
        comment: 'Excellent service!'
      };
      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(reviewData);

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('rating', 5);
      expect(res.body).toHaveProperty('comment', 'Excellent service!');
      expect(res.body).toHaveProperty('client', clientUser._id.toString());
      expect(res.body).toHaveProperty('prestataire', prestataireUser._id.toString());
    });

    it('should return 404 if the request does not exist or does not belong to the client', async () => {
        const res = await request(app)
          .post('/api/reviews')
          .set('Authorization', `Bearer ${clientToken}`)
          .send({ requestId: new ObjectId().toString(), rating: 4 });
        expect(res.statusCode).toEqual(404);
    });
  });

  describe('GET /api/reviews/:prestataireId', () => {
    it('should return all reviews for a given prestataire', async () => {
      const db = getDB();
      await db.collection('reviews').insertMany([
        { prestataire: prestataireUser._id, rating: 5, comment: 'Great!' },
        { prestataire: prestataireUser._id, rating: 4, comment: 'Good.' },
        { prestataire: new ObjectId(), rating: 3, comment: 'Okay.' }
      ]);

      const res = await request(app)
        .get(`/api/reviews/${prestataireUser._id.toString()}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBe(2);
    });

    it('should return an empty array if prestataire has no reviews', async () => {
        const res = await request(app)
          .get(`/api/reviews/${prestataireUser._id.toString()}`);
        
        expect(res.statusCode).toEqual(200);
        expect(res.body).toEqual([]);
    });
  });
});
