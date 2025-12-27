/**
 * User Settings Model for MongoDB
 * Stores user preferences and static configuration data
 */

const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    // UI Preferences
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'light',
    },
    language: {
      type: String,
      default: 'en',
    },
    notifications: {
      email: {
        type: Boolean,
        default: true,
      },
      inApp: {
        type: Boolean,
        default: true,
      },
      usageAlerts: {
        type: Boolean,
        default: true,
      },
    },
    // Code-to-Doc Preferences
    codeToDoc: {
      defaultMode: {
        type: String,
        enum: ['upload', 'github'],
        default: 'upload',
      },
      autoGenerate: {
        type: Boolean,
        default: false,
      },
      maxFiles: {
        type: Number,
        default: 5,
      },
    },
    // Bot Preferences
    bot: {
      defaultModel: {
        type: String,
        default: 'qwen3-14b',
      },
      temperature: {
        type: Number,
        default: 0.7,
        min: 0,
        max: 2,
      },
    },
    // Other preferences
    preferences: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Create default settings when user is created
settingsSchema.statics.createDefault = async function (userId) {
  const defaultSettings = {
    user: userId,
    theme: 'light',
    language: 'en',
    notifications: {
      email: true,
      inApp: true,
      usageAlerts: true,
    },
    codeToDoc: {
      defaultMode: 'upload',
      autoGenerate: false,
      maxFiles: 5,
    },
    bot: {
      defaultModel: 'qwen3-14b',
      temperature: 0.7,
    },
    preferences: {},
  };
  return await this.create(defaultSettings);
};

module.exports = mongoose.model('Settings', settingsSchema);

