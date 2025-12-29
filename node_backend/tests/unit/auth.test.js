/**
 * Unit tests for Authentication
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../../src/models/User');
const { protect } = require('../../src/middleware/auth');

// Mock dependencies
jest.mock('../../src/models/User');
jest.mock('bcryptjs');

describe('Authentication', () => {
  let mockUser;
  let mockRequest;
  let mockResponse;
  let nextFunction;

  beforeEach(() => {
    mockUser = {
      _id: 'user123',
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashedpassword',
      plan: 'free',
      isActive: true,
    };

    mockRequest = {
      headers: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    nextFunction = jest.fn();
  });

  describe('JWT Token Generation', () => {
    test('should generate valid JWT token', () => {
      const token = jwt.sign(
        { userId: mockUser._id },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '30d' }
      );

      expect(token).toBeDefined();
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
      expect(decoded.userId).toBe(mockUser._id);
    });
  });

  describe('Password Hashing', () => {
    test('should hash password correctly', async () => {
      const password = 'testpassword123';
      const hashedPassword = await bcrypt.hash(password, 10);

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);

      const isValid = await bcrypt.compare(password, hashedPassword);
      expect(isValid).toBe(true);
    });
  });

  describe('Auth Middleware', () => {
    test('should allow request with valid token', async () => {
      const token = jwt.sign(
        { userId: mockUser._id },
        process.env.JWT_SECRET || 'test-secret'
      );

      mockRequest.headers.authorization = `Bearer ${token}`;
      User.findById.mockResolvedValue(mockUser);

      await protect(mockRequest, mockResponse, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.user).toBeDefined();
    });

    test('should reject request without token', async () => {
      await protect(mockRequest, mockResponse, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Not authorized, no token',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    test('should reject request with invalid token', async () => {
      mockRequest.headers.authorization = 'Bearer invalid-token';

      await protect(mockRequest, mockResponse, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });
});

