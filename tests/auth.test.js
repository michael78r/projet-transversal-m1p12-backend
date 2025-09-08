const request = require('supertest');
const express = require('express');
const { connectDB, getDB, closeDB } = require('../config/db');
const authRoutes = require('../routes/authRoutes');
const errorHandler = require('../middlewares/errorHandler');

const app = express();
let server;

beforeAll(async () => {
  // Connect to a test database
  process.env.MONGO_URI = process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/test-auth-db';
  await connectDB();
  
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use(errorHandler);
  server = app.listen(4001); // Use a different port for tests
});

afterAll(async () => {
  const db = getDB();
  await db.dropDatabase();
  await closeDB();
  server.close();
});

beforeEach(async () => {
  // Clear the users collection before each test
  const db = getDB();
  await db.collection('users').deleteMany({});
});

describe('Auth Routes', () => {
  it('should register a new user successfully', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'client',
      });
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('message', 'User registered successfully');
  });

  it('should fail to register a user with an existing email', async () => {
    // First, register a user
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'client',
      });

    // Then, try to register again with the same email
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Another User',
        email: 'test@example.com',
        password: 'password456',
        role: 'prestataire',
      });
      
    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('message', 'User with this email already exists');
  });

  it('should login an existing user and return a token', async () => {
    // Register user first
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: 'login@example.com',
        password: 'password123',
        role: 'client',
      });

    // Attempt to login
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'login@example.com',
        password: 'password123',
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.token).toContain('Bearer ');
  });

  it('should fail to login with incorrect password', async () => {
    // Register user first
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: 'login@example.com',
        password: 'password123',
        role: 'client',
      });

    // Attempt to login with wrong password
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'login@example.com',
        password: 'wrongpassword',
      });

    expect(res.statusCode).toEqual(401);
    expect(res.body).toHaveProperty('message', 'Authentication failed. Wrong password.');
  });
});
