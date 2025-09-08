const request = require('supertest');
const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { connectDB, getDB, closeDB } = require('../config/db');
const userRoutes = require('../routes/userRoutes');
const errorHandler = require('../middlewares/errorHandler');
const { jwtSecret } = require('../config');

const app = express();
let server;
let testUser;
let token;

beforeAll(async () => {
  process.env.MONGO_URI = process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/test-user-db';
  await connectDB();
  
  app.use(express.json());
  app.use(passport.initialize());
  require('../config/passport')(passport);
  app.use('/api/users', userRoutes);
  app.use(errorHandler);
  server = app.listen(4002);

  // Create a test user directly in the DB
  const db = getDB();
  const result = await db.collection('users').insertOne({
    name: 'Test User',
    email: 'user@example.com',
    password: 'hashedpassword', // Not used for login, just for existence
    role: 'client'
  });
  testUser = { _id: result.insertedId, role: 'client' };

  // Generate a token for the test user
  token = jwt.sign({ id: testUser._id, role: testUser.role }, jwtSecret, { expiresIn: '1h' });
});

afterAll(async () => {
  const db = getDB();
  await db.dropDatabase();
  await closeDB();
  server.close();
});

describe('User Routes', () => {
  describe('GET /api/users/profile', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app).get('/api/users/profile');
      expect(res.statusCode).toEqual(401);
    });

    it('should return user profile if authenticated', async () => {
      const res = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('email', 'user@example.com');
      expect(res.body).not.toHaveProperty('password');
    });
  });

  describe('PUT /api/users/profile', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .put('/api/users/profile')
        .send({ name: 'Updated Name' });
      expect(res.statusCode).toEqual(401);
    });

    it('should update and return the user profile if authenticated', async () => {
      const newProfileData = {
        description: 'I am a test user.',
        skills: ['testing', 'jest']
      };

      const res = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Updated Name',
          profile: newProfileData
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('name', 'Updated Name');
      expect(res.body).toHaveProperty('profile');
      expect(res.body.profile).toEqual(newProfileData);

      // Verify the update in the database
      const db = getDB();
      const updatedUser = await db.collection('users').findOne({ _id: testUser._id });
      expect(updatedUser.name).toEqual('Updated Name');
      expect(updatedUser.profile.description).toEqual('I am a test user.');
    });
  });
});
