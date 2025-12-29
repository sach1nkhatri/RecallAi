/**
 * Integration tests for Help/FAQ API
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const HelpFAQ = require('../../src/models/HelpFAQ');
const Admin = require('../../src/models/Admin');

describe('Help/FAQ API', () => {
  let adminToken;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test_recall_ai');
    }

    // Create admin
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('0852369147', 10);
    await Admin.findOneAndUpdate(
      { username: 'admin' },
      { username: 'admin', password: hashedPassword },
      { upsert: true, new: true }
    );

    // Login as admin
    const loginResponse = await request(app)
      .post('/api/admin/login')
      .send({ password: '0852369147' });
    adminToken = loginResponse.body.token;
  });

  afterAll(async () => {
    await HelpFAQ.deleteMany({});
    await mongoose.connection.close();
  });

  describe('POST /api/admin/help-faq', () => {
    test('should create new FAQ', async () => {
      const response = await request(app)
        .post('/api/admin/help-faq')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          category: 'general',
          question: 'How do I get started?',
          answer: 'Sign up and create your first bot.',
          order: 1,
          isActive: true,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.faq.question).toBe('How do I get started?');
    });
  });

  describe('GET /api/help-faq', () => {
    test('should get active FAQs', async () => {
      // Create test FAQ
      await HelpFAQ.create({
        category: 'general',
        question: 'Test Question',
        answer: 'Test Answer',
        isActive: true,
      });

      const response = await request(app)
        .get('/api/help-faq');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.faqs).toBeDefined();
      expect(Array.isArray(response.body.faqs)).toBe(true);
    });
  });

  describe('PUT /api/admin/help-faq/:id', () => {
    test('should update FAQ', async () => {
      const faq = await HelpFAQ.create({
        category: 'general',
        question: 'Original Question',
        answer: 'Original Answer',
        isActive: true,
      });

      const response = await request(app)
        .put(`/api/admin/help-faq/${faq._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          question: 'Updated Question',
          answer: 'Updated Answer',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.faq.question).toBe('Updated Question');
    });
  });

  describe('DELETE /api/admin/help-faq/:id', () => {
    test('should delete FAQ', async () => {
      const faq = await HelpFAQ.create({
        category: 'general',
        question: 'To Delete',
        answer: 'Answer',
        isActive: true,
      });

      const response = await request(app)
        .delete(`/api/admin/help-faq/${faq._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify deletion
      const deleted = await HelpFAQ.findById(faq._id);
      expect(deleted).toBeNull();
    });
  });
});

