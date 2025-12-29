/**
 * Integration tests for Payment API
 */

const request = require('supertest');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const app = require('../../server');
const User = require('../../src/models/User');
const Payment = require('../../src/models/Payment');

describe('Payment API', () => {
  let authToken;
  let adminToken;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test_recall_ai');
    }
  });

  afterAll(async () => {
    await Payment.deleteMany({});
    await User.deleteMany({ email: /test@/ });
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Create test user
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      });
    authToken = registerResponse.body.token;
  });

  afterEach(async () => {
    await Payment.deleteMany({});
  });

  describe('POST /api/payments/submit', () => {
    test('should submit payment with screenshot', async () => {
      // Create a dummy image file
      const fixturesDir = path.join(__dirname, '../fixtures');
      if (!fs.existsSync(fixturesDir)) {
        fs.mkdirSync(fixturesDir, { recursive: true });
      }
      const testImagePath = path.join(fixturesDir, 'test-image.png');
      // Create dummy file
      fs.writeFileSync(testImagePath, Buffer.from('fake-image-data'));

      const response = await request(app)
        .post('/api/payments/submit')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('screenshot', testImagePath)
        .field('plan', 'pro')
        .field('planDuration', 'monthly')
        .field('amount', '700')
        .field('paymentMethod', 'eSewa');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.payment).toBeDefined();
      expect(response.body.payment.status).toBe('pending');
    });

    test('should require all fields', async () => {
      const response = await request(app)
        .post('/api/payments/submit')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          plan: 'pro',
          // Missing other required fields
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/payments/my-payments', () => {
    test('should get user payments', async () => {
      // Create a test payment
      const user = await User.findOne({ email: 'test@example.com' });
      await Payment.create({
        userId: user._id,
        plan: 'pro',
        planDuration: 'monthly',
        amount: 700,
        paymentMethod: 'eSewa',
        screenshot: 'test-screenshot.png',
        status: 'pending',
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const response = await request(app)
        .get('/api/payments/my-payments')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.payments).toBeDefined();
      expect(Array.isArray(response.body.payments)).toBe(true);
    });
  });
});

