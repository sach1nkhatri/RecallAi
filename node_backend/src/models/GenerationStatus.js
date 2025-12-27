/**
 * Generation Status Model for MongoDB
 * Tracks code-to-doc generation progress
 */

const mongoose = require('mongoose');

const generationStatusSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['file_upload', 'github_repo'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'ingesting', 'scanning', 'indexing', 'generating', 'merging', 'completed', 'failed'],
      default: 'pending',
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    currentStep: {
      type: String,
      default: '',
    },
    totalSteps: {
      type: Number,
      default: 0,
    },
    completedSteps: {
      type: Number,
      default: 0,
    },
    // For file upload mode
    fileCount: {
      type: Number,
      default: 0,
    },
    // For GitHub repo mode
    repoUrl: {
      type: String,
    },
    repoId: {
      type: String,
    },
    repoInfo: {
      totalFiles: Number,
      includedFiles: Number,
      skippedFiles: Number,
    },
    // Results
    markdown: {
      type: String,
    },
    pdfUrl: {
      type: String,
    },
    pdfInfo: {
      filename: String,
      size: Number,
    },
    // Error information
    error: {
      message: String,
      code: String,
      timestamp: Date,
    },
    // Metadata
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
    estimatedTimeRemaining: {
      type: Number, // in seconds
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
generationStatusSchema.index({ user: 1, createdAt: -1 });
generationStatusSchema.index({ status: 1 });
generationStatusSchema.index({ type: 1 });

module.exports = mongoose.model('GenerationStatus', generationStatusSchema);

