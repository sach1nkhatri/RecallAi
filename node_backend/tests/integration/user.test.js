/**
 * Integration tests for User Management API
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const User = require('../../src/models/User');

describe('User Management API', () => {
  let authToken;
  let testUserId;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test_recall_ai');
    }
  });

  afterAll(async () => {
    await User.deleteMany({ email: /test@/ });
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Create test user and get token
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      });
    authToken = registerResponse.body.token;
    testUserId = registerResponse.body.user.id;
  });

  afterEach(async () => {
    await User.deleteMany({ email: /test@/ });
  });

  describe('GET /api/users/usage', () => {
    test('should get user usage statistics', async () => {
      const response = await request(app)
        .get('/api/users/usage')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.usage).toBeDefined();
      expect(response.body.usage.bots).toBeDefined();
      expect(response.body.usage.chats).toBeDefined();
      expect(response.body.usage.codeToDoc).toBeDefined();
      expect(response.body.usage.tokens).toBeDefined();
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/users/usage');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/users/usage/increment', () => {
    test('should increment usage counter', async () => {
      const response = await request(app)
        .post('/api/users/usage/increment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'chats',
          amount: 1,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.usage).toBeDefined();
    });

    test('should validate usage type', async () => {
      const response = await request(app)
        .post('/api/users/usage/increment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'invalid_type',
          amount: 1,
        });

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/users/plan', () => {
    test('should update user plan', async () => {
      const response = await request(app)
        .put('/api/users/plan')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          plan: 'pro',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.plan).toBe('pro');
    });

    test('should validate plan type', async () => {
      const response = await request(app)
        .put('/api/users/plan')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          plan: 'invalid_plan',
        });

      expect(response.status).toBe(400);
    });
  });
});

