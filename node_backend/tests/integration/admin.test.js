/**
 * Integration tests for Admin API
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const Admin = require('../../src/models/Admin');
const User = require('../../src/models/User');
const Payment = require('../../src/models/Payment');

describe('Admin API', () => {
  let adminToken;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test_recall_ai');
    }

    // Create admin user
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('0852369147', 10);
    await Admin.findOneAndUpdate(
      { username: 'admin' },
      { username: 'admin', password: hashedPassword },
      { upsert: true, new: true }
    );
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Login as admin
    const loginResponse = await request(app)
      .post('/api/admin/login')
      .send({
        password: '0852369147',
      });
    adminToken = loginResponse.body.token;
  });

  describe('POST /api/admin/login', () => {
    test('should login with correct password', async () => {
      const response = await request(app)
        .post('/api/admin/login')
        .send({
          password: '0852369147',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
    });

    test('should reject incorrect password', async () => {
      const response = await request(app)
        .post('/api/admin/login')
        .send({
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/admin/stats', () => {
    test('should get dashboard statistics', async () => {
      const response = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.stats).toBeDefined();
      expect(response.body.stats.users).toBeDefined();
      expect(response.body.stats.payments).toBeDefined();
    });

    test('should require admin authentication', async () => {
      const response = await request(app)
        .get('/api/admin/stats');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/admin/users', () => {
    test('should get all users', async () => {
      // Create test users
      await User.create([
        { name: 'User 1', email: 'user1@test.com', password: 'hashed', plan: 'free' },
        { name: 'User 2', email: 'user2@test.com', password: 'hashed', plan: 'pro' },
      ]);

      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.users).toBeDefined();
      expect(Array.isArray(response.body.users)).toBe(true);
    });
  });

  describe('PUT /api/admin/payments/:id/approve', () => {
    test('should approve payment', async () => {
      // Create test user and payment
      const user = await User.create({
        name: 'Test User',
        email: 'payment@test.com',
        password: 'hashed',
        plan: 'free',
      });

      const payment = await Payment.create({
        userId: user._id,
        plan: 'pro',
        planDuration: 'monthly',
        amount: 700,
        paymentMethod: 'eSewa',
        screenshot: 'test.png',
        status: 'pending',
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const response = await request(app)
        .put(`/api/admin/payments/${payment._id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          adminNotes: 'Payment verified',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify payment was approved and user plan updated
      const updatedPayment = await Payment.findById(payment._id);
      expect(updatedPayment.status).toBe('approved');
      const updatedUser = await User.findById(user._id);
      expect(updatedUser.plan).toBe('pro');
    });
  });
});

