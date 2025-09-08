const request = require('supertest');
const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');
const { connectDB, getDB, closeDB } = require('../config/db');
const adminRoutes = require('../routes/adminRoutes');
const errorHandler = require('../middlewares/errorHandler');
const { jwtSecret } = require('../config');

const app = express();
let server;
let adminUser, clientUser, prestataireUser;
let adminToken, clientToken, prestataireToken;

beforeAll(async () => {
  process.env.MONGO_URI = process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/test-admin-db';
  await connectDB();
  
  app.use(express.json());
  app.use(passport.initialize());
  require('../config/passport')(passport);
  app.use('/api/admin', adminRoutes);
  app.use(errorHandler);
  server = app.listen(4006);

  const db = getDB();
  // Create users
  const adminResult = await db.collection('users').insertOne({ name: 'Admin', email: 'admin@example.com', role: 'admin' });
  adminUser = { _id: adminResult.insertedId, role: 'admin' };
  adminToken = jwt.sign({ id: adminUser._id, role: adminUser.role }, jwtSecret);

  const clientResult = await db.collection('users').insertOne({ name: 'Client', email: 'client.admin@example.com', role: 'client' });
  clientUser = { _id: clientResult.insertedId, role: 'client' };
  clientToken = jwt.sign({ id: clientUser._id, role: clientUser.role }, jwtSecret);

  const presResult = await db.collection('users').insertOne({ name: 'Prestataire', email: 'pres.admin@example.com', role: 'prestataire' });
  prestataireUser = { _id: presResult.insertedId, role: 'prestataire' };
  prestataireToken = jwt.sign({ id: prestataireUser._id, role: prestataireUser.role }, jwtSecret);
});

afterAll(async () => {
  const db = getDB();
  await db.dropDatabase();
  await closeDB();
  server.close();
});

describe('Admin Routes', () => {
  describe('GET /api/admin/users', () => {
    it('should be forbidden for non-admin users', async () => {
      const clientRes = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${clientToken}`);
      expect(clientRes.statusCode).toEqual(403);

      const presRes = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${prestataireToken}`);
      expect(presRes.statusCode).toEqual(403);
    });

    it('should allow admin to get a list of all users', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBe(3); // Admin, Client, Prestataire
      // Check that passwords are not sent
      expect(res.body[0].password).toBeUndefined();
    });
  });

  describe('PUT /api/admin/users/:id/manage', () => {
    it('should be forbidden for non-admin users', async () => {
      const res = await request(app)
        .put(`/api/admin/users/${clientUser._id}/manage`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ isBanned: true });
      expect(res.statusCode).toEqual(403);
    });

    it('should allow admin to update a user', async () => {
      const res = await request(app)
        .put(`/api/admin/users/${clientUser._id}/manage`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isBanned: true, notes: 'Test ban' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toBe('User updated successfully');
      expect(res.body.user.isBanned).toBe(true);
      expect(res.body.user.notes).toBe('Test ban');

      // Verify in DB
      const db = getDB();
      const updatedUser = await db.collection('users').findOne({ _id: clientUser._id });
      expect(updatedUser.isBanned).toBe(true);
    });

    it('should return 404 if user to manage does not exist', async () => {
        const nonExistentId = new ObjectId();
        const res = await request(app)
          .put(`/api/admin/users/${nonExistentId}/manage`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ isBanned: true });
        expect(res.statusCode).toEqual(404);
    });
  });
});
