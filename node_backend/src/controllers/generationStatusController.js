/**
 * Generation Status Controller
 */

const GenerationStatus = require('../models/GenerationStatus');
const { validationResult } = require('express-validator');

// @desc    Create or update generation status
// @route   POST /api/generation-status
// @access  Private
const createOrUpdateStatus = async (req, res) => {
  try {
    const {
      type,
      status,
      progress,
      currentStep,
      totalSteps,
      completedSteps,
      fileCount,
      repoUrl,
      repoId,
      repoInfo,
      markdown,
      pdfUrl,
      pdfInfo,
      error,
      estimatedTimeRemaining,
    } = req.body;

    // Find existing status or create new
    let generationStatus = await GenerationStatus.findOne({
      user: req.user._id,
      status: { $in: ['pending', 'ingesting', 'scanning', 'indexing', 'generating', 'merging'] },
    }).sort({ createdAt: -1 });

    if (!generationStatus) {
      // Create new status
      generationStatus = await GenerationStatus.create({
        user: req.user._id,
        type: type || 'file_upload',
        status: status || 'pending',
        progress: progress || 0,
        currentStep: currentStep || '',
        totalSteps: totalSteps || 0,
        completedSteps: completedSteps || 0,
        fileCount: fileCount || 0,
        repoUrl,
        repoId,
        repoInfo,
        estimatedTimeRemaining,
      });
    } else {
      // Update existing status
      if (status) generationStatus.status = status;
      if (progress !== undefined) generationStatus.progress = progress;
      if (currentStep !== undefined) generationStatus.currentStep = currentStep;
      if (totalSteps !== undefined) generationStatus.totalSteps = totalSteps;
      if (completedSteps !== undefined) generationStatus.completedSteps = completedSteps;
      if (fileCount !== undefined) generationStatus.fileCount = fileCount;
      if (repoUrl) generationStatus.repoUrl = repoUrl;
      if (repoId) generationStatus.repoId = repoId;
      if (repoInfo) generationStatus.repoInfo = repoInfo;
      if (markdown) generationStatus.markdown = markdown;
      if (pdfUrl) generationStatus.pdfUrl = pdfUrl;
      if (pdfInfo) generationStatus.pdfInfo = pdfInfo;
      if (estimatedTimeRemaining !== undefined) generationStatus.estimatedTimeRemaining = estimatedTimeRemaining;

      if (error) {
        generationStatus.error = {
          message: error.message || error,
          code: error.code,
          timestamp: new Date(),
        };
        generationStatus.status = 'failed';
      }

      if (status === 'completed') {
        generationStatus.completedAt = new Date();
      }

      await generationStatus.save();
    }

    res.status(200).json({
      success: true,
      status: generationStatus,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
};

// @desc    Get current generation status
// @route   GET /api/generation-status/current
// @access  Private
const getCurrentStatus = async (req, res) => {
  try {
    const status = await GenerationStatus.findOne({
      user: req.user._id,
      status: { $in: ['pending', 'ingesting', 'scanning', 'indexing', 'generating', 'merging'] },
    }).sort({ createdAt: -1 });

    if (!status) {
      return res.status(200).json({
        success: true,
        status: null,
        message: 'No active generation',
      });
    }

    res.status(200).json({
      success: true,
      status,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
};

// @desc    Get generation history
// @route   GET /api/generation-status/history
// @access  Private
const getHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const statuses = await GenerationStatus.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-markdown'); // Don't send full markdown in list

    const total = await GenerationStatus.countDocuments({ user: req.user._id });

    res.status(200).json({
      success: true,
      statuses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
};

// @desc    Get a specific generation status
// @route   GET /api/generation-status/:id
// @access  Private
const getStatusById = async (req, res) => {
  try {
    const status = await GenerationStatus.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'Generation status not found',
      });
    }

    res.status(200).json({
      success: true,
      status,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
};

// @desc    Cancel a generation
// @route   DELETE /api/generation-status/:id
// @access  Private
const cancelGeneration = async (req, res) => {
  try {
    const status = await GenerationStatus.findOne({
      _id: req.params.id,
      user: req.user._id,
      status: { $in: ['pending', 'ingesting', 'scanning', 'indexing', 'generating', 'merging'] },
    });

    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'Active generation not found',
      });
    }

    status.status = 'failed';
    status.error = {
      message: 'Generation cancelled by user',
      timestamp: new Date(),
    };
    await status.save();

    res.status(200).json({
      success: true,
      message: 'Generation cancelled',
      status,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
};

module.exports = {
  createOrUpdateStatus,
  getCurrentStatus,
  getHistory,
  getStatusById,
  cancelGeneration,
};

