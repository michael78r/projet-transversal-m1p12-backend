const request = require('supertest');
const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { connectDB, getDB, closeDB } = require('../config/db');
const serviceRoutes = require('../routes/serviceRoutes');
const errorHandler = require('../middlewares/errorHandler');
const { jwtSecret } = require('../config');

const app = express();
let server;
let prestataireUser, clientUser;
let prestataireToken, clientToken;

beforeAll(async () => {
  process.env.MONGO_URI = process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/test-service-db';
  await connectDB();
  
  app.use(express.json());
  app.use(passport.initialize());
  require('../config/passport')(passport);
  app.use('/api/services', serviceRoutes);
  app.use(errorHandler);
  server = app.listen(4003);

  const db = getDB();
  // Create a prestataire user
  const presResult = await db.collection('users').insertOne({
    name: 'Test Prestataire',
    email: 'prestataire@example.com',
    password: 'hashedpassword',
    role: 'prestataire'
  });
  prestataireUser = { _id: presResult.insertedId, role: 'prestataire' };
  prestataireToken = jwt.sign({ id: prestataireUser._id, role: prestataireUser.role }, jwtSecret);

  // Create a client user
  const clientResult = await db.collection('users').insertOne({
    name: 'Test Client',
    email: 'client@example.com',
    password: 'hashedpassword',
    role: 'client'
  });
  clientUser = { _id: clientResult.insertedId, role: 'client' };
  clientToken = jwt.sign({ id: clientUser._id, role: clientUser.role }, jwtSecret);
});

afterAll(async () => {
  const db = getDB();
  await db.dropDatabase();
  await closeDB();
  server.close();
});

beforeEach(async () => {
  const db = getDB();
  await db.collection('services').deleteMany({});
});

describe('Service Routes', () => {
  describe('POST /api/services', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app).post('/api/services').send({});
      expect(res.statusCode).toEqual(401);
    });

    it('should return 403 if user is a client', async () => {
      const res = await request(app)
        .post('/api/services')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ title: 'A service', price: 100 });
      expect(res.statusCode).toEqual(403);
    });

    it('should create a service if user is a prestataire', async () => {
      const serviceData = {
        title: 'Test Service',
        description: 'This is a test service.',
        category: 'Testing',
        price: 99.99
      };
      const res = await request(app)
        .post('/api/services')
        .set('Authorization', `Bearer ${prestataireToken}`)
        .send(serviceData);

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('title', 'Test Service');
      expect(res.body).toHaveProperty('prestataire', prestataireUser._id.toString());

      const db = getDB();
      const serviceInDb = await db.collection('services').findOne({ title: 'Test Service' });
      expect(serviceInDb).not.toBeNull();
    });
  });

  describe('GET /api/services', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app).get('/api/services');
      expect(res.statusCode).toEqual(401);
    });

    it('should return 403 if user is a client', async () => {
        const res = await request(app)
          .get('/api/services')
          .set('Authorization', `Bearer ${clientToken}`);
        expect(res.statusCode).toEqual(403);
    });

    it('should return services for the authenticated prestataire', async () => {
      const db = getDB();
      await db.collection('services').insertOne({
        title: 'My Service',
        prestataire: prestataireUser._id,
        price: 50
      });
      await db.collection('services').insertOne({
        title: 'Another Prestataire Service',
        prestataire: 'some_other_id',
        price: 150
      });

      const res = await request(app)
        .get('/api/services')
        .set('Authorization', `Bearer ${prestataireToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBe(1);
      expect(res.body[0].title).toBe('My Service');
    });
  });
});
