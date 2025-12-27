/**
 * User Model for MongoDB
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't return password by default
    },
    plan: {
      type: String,
      enum: ['free', 'pro', 'enterprise'],
      default: 'free',
    },
    usage: {
      bots: {
        current: { type: Number, default: 0 },
        limit: { type: Number, default: 1 },
      },
      chats: {
        today: { type: Number, default: 0 },
        limit: { type: Number, default: 10 },
        lastReset: { type: Date, default: Date.now },
      },
      codeToDoc: {
        used: { type: Number, default: 0 },
        limit: { type: Number, default: 2 },
      },
      tokens: {
        used: { type: Number, default: 0 },
        limit: { type: Number, default: 5000 },
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to reset daily usage
userSchema.methods.resetDailyUsage = function () {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lastReset = new Date(this.usage.chats.lastReset);
  lastReset.setHours(0, 0, 0, 0);

  if (lastReset.getTime() !== today.getTime()) {
    this.usage.chats.today = 0;
    this.usage.chats.lastReset = today;
  }
};

// Update plan limits based on plan type
userSchema.pre('save', function (next) {
  if (this.isModified('plan')) {
    switch (this.plan) {
      case 'free':
        this.usage.bots.limit = 1;
        this.usage.chats.limit = 10;
        this.usage.codeToDoc.limit = 2;
        this.usage.tokens.limit = 5000;
        break;
      case 'pro':
        this.usage.bots.limit = 10;
        this.usage.chats.limit = 100;
        this.usage.codeToDoc.limit = 50;
        this.usage.tokens.limit = 50000;
        break;
      case 'enterprise':
        this.usage.bots.limit = -1; // Unlimited
        this.usage.chats.limit = -1;
        this.usage.codeToDoc.limit = -1;
        this.usage.tokens.limit = -1;
        break;
    }
  }
  next();
});

module.exports = mongoose.model('User', userSchema);

