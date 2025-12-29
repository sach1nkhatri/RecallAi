/**
 * Unit tests for User Model
 */

const User = require('../../src/models/User');
const mongoose = require('mongoose');

describe('User Model', () => {
  test('should create user with default usage limits', () => {
    const userData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashedpassword',
      plan: 'free',
    };

    const user = new User(userData);

    expect(user.usage.bots.limit).toBe(1);
    expect(user.usage.chats.limit).toBe(10);
    expect(user.usage.codeToDoc.limit).toBe(2);
    expect(user.usage.tokens.limit).toBe(5000);
  });

  test('should set pro plan limits correctly', () => {
    const user = new User({
      name: 'Test',
      email: 'test@example.com',
      password: 'hashed',
      plan: 'pro',
    });

    expect(user.usage.bots.limit).toBe(10);
    expect(user.usage.chats.limit).toBe(100);
    expect(user.usage.codeToDoc.limit).toBe(50);
    expect(user.usage.tokens.limit).toBe(50000);
  });

  test('should set enterprise plan limits to unlimited', () => {
    const user = new User({
      name: 'Test',
      email: 'test@example.com',
      password: 'hashed',
      plan: 'enterprise',
    });

    expect(user.usage.bots.limit).toBe(-1); // Unlimited
    expect(user.usage.chats.limit).toBe(-1);
    expect(user.usage.codeToDoc.limit).toBe(-1);
    expect(user.usage.tokens.limit).toBe(-1);
  });

  test('should reset daily usage correctly', () => {
    const user = new User({
      name: 'Test',
      email: 'test@example.com',
      password: 'hashed',
    });

    user.usage.chats.today = 5;
    user.usage.chats.lastReset = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago

    user.resetDailyUsage();

    expect(user.usage.chats.today).toBe(0);
  });
});

