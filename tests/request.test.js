const request = require('supertest');
const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');
const { connectDB, getDB, closeDB } = require('../config/db');
const requestRoutes = require('../routes/requestRoutes');
const errorHandler = require('../middlewares/errorHandler');
const { jwtSecret } = require('../config');

const app = express();
let server;
let prestataireUser, clientUser, testService;
let prestataireToken, clientToken;

beforeAll(async () => {
  process.env.MONGO_URI = process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/test-request-db';
  await connectDB();
  
  app.use(express.json());
  app.use(passport.initialize());
  require('../config/passport')(passport);
  app.use('/api/requests', requestRoutes);
  app.use(errorHandler);
  server = app.listen(4004);

  const db = getDB();
  // Create users
  const presResult = await db.collection('users').insertOne({ name: 'Req Prestataire', email: 'req.pres@example.com', role: 'prestataire' });
  prestataireUser = { _id: presResult.insertedId, role: 'prestataire' };
  prestataireToken = jwt.sign({ id: prestataireUser._id, role: prestataireUser.role }, jwtSecret);

  const clientResult = await db.collection('users').insertOne({ name: 'Req Client', email: 'req.client@example.com', role: 'client' });
  clientUser = { _id: clientResult.insertedId, role: 'client' };
  clientToken = jwt.sign({ id: clientUser._id, role: clientUser.role }, jwtSecret);

  // Create a service
  const serviceResult = await db.collection('services').insertOne({
    title: 'Service to be Requested',
    prestataire: prestataireUser._id,
    price: 200
  });
  testService = { _id: serviceResult.insertedId };
});

afterAll(async () => {
  const db = getDB();
  await db.dropDatabase();
  await closeDB();
  server.close();
});

beforeEach(async () => {
  const db = getDB();
  await db.collection('requests').deleteMany({});
});

describe('Request Routes', () => {
  describe('POST /api/requests', () => {
    it('should be forbidden for a prestataire to create a request', async () => {
      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${prestataireToken}`)
        .send({ serviceId: testService._id.toString() });
      expect(res.statusCode).toEqual(403);
    });

    it('should allow a client to create a request for a service', async () => {
      const requestDetails = {
        lieu: 'Online',
        duree: '2 hours'
      };
      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          serviceId: testService._id.toString(),
          details: requestDetails
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('status', 'pending');
      expect(res.body).toHaveProperty('client', clientUser._id.toString());
      expect(res.body).toHaveProperty('prestataire', prestataireUser._id.toString());
      expect(res.body.details).toEqual(requestDetails);
    });

    it('should return 404 if the service does not exist', async () => {
        const nonExistentId = new ObjectId();
        const res = await request(app)
          .post('/api/requests')
          .set('Authorization', `Bearer ${clientToken}`)
          .send({ serviceId: nonExistentId.toString() });
        expect(res.statusCode).toEqual(404);
    });
  });

  describe('GET /api/requests', () => {
    it('should return requests for both client and prestataire roles', async () => {
      const db = getDB();
      // Request where our client is the client
      await db.collection('requests').insertOne({
        client: clientUser._id,
        prestataire: new ObjectId(),
        service: new ObjectId()
      });
      // Request where our prestataire is the prestataire
      await db.collection('requests').insertOne({
        client: new ObjectId(),
        prestataire: prestataireUser._id,
        service: new ObjectId()
      });
      // Unrelated request
      await db.collection('requests').insertOne({
        client: new ObjectId(),
        prestataire: new ObjectId(),
        service: new ObjectId()
      });

      // Check for client
      const clientRes = await request(app)
        .get('/api/requests')
        .set('Authorization', `Bearer ${clientToken}`);
      expect(clientRes.statusCode).toEqual(200);
      expect(clientRes.body.length).toBe(1);
      expect(clientRes.body[0].client).toBe(clientUser._id.toString());

      // Check for prestataire
      const prestataireRes = await request(app)
        .get('/api/requests')
        .set('Authorization', `Bearer ${prestataireToken}`);
      expect(prestataireRes.statusCode).toEqual(200);
      expect(prestataireRes.body.length).toBe(1);
      expect(prestataireRes.body[0].prestataire).toBe(prestataireUser._id.toString());
    });
  });
});
