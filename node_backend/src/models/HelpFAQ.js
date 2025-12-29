/**
 * Help and FAQ Model for MongoDB
 */

const mongoose = require('mongoose');

const helpFAQSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: ['general', 'billing', 'technical', 'account', 'features'],
      required: true,
    },
    question: {
      type: String,
      required: true,
    },
    answer: {
      type: String,
      required: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
helpFAQSchema.index({ category: 1, isActive: 1, order: 1 });

module.exports = mongoose.model('HelpFAQ', helpFAQSchema);

