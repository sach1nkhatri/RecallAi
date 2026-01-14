/**
 * Generation Status Controller
 */

const GenerationStatus = require('../models/GenerationStatus');
const { validationResult } = require('express-validator');

// Store active SSE connections per user
const activeConnections = new Map();

// Function to broadcast status update to all connected clients for a user
const broadcastStatusUpdate = async (userId, status) => {
  const userConnections = activeConnections.get(userId.toString());
  if (userConnections && userConnections.size > 0) {
    const message = JSON.stringify({ success: true, status });
    const deadConnections = [];
    
    userConnections.forEach((res) => {
      try {
        res.write(`data: ${message}\n\n`);
      } catch (error) {
        // Connection is dead, mark for removal
        deadConnections.push(res);
      }
    });
    
    // Remove dead connections
    deadConnections.forEach((res) => {
      userConnections.delete(res);
    });
    
    if (userConnections.size === 0) {
      activeConnections.delete(userId.toString());
    }
    
    if (userConnections.size > 0) {
      console.log(`📡 Broadcasted status update to ${userConnections.size} client(s) for user ${userId}`);
    }
  }
};

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
      // Create new status - include all fields including markdown, pdfUrl, pdfInfo
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
        markdown, // Include markdown when creating new status
        pdfUrl, // Include pdfUrl when creating new status
        pdfInfo, // Include pdfInfo when creating new status
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
      // Always update markdown, pdfUrl, pdfInfo if provided (even if empty string to clear)
      if (markdown !== undefined) generationStatus.markdown = markdown;
      if (pdfUrl !== undefined) generationStatus.pdfUrl = pdfUrl;
      if (pdfInfo !== undefined) generationStatus.pdfInfo = pdfInfo;
      if (estimatedTimeRemaining !== undefined) generationStatus.estimatedTimeRemaining = estimatedTimeRemaining;

      if (error) {
        // Handle both object and string error formats
        const errorMessage = typeof error === 'string' 
          ? error 
          : (error.message || (typeof error === 'object' ? JSON.stringify(error) : String(error)));
        const errorCode = (typeof error === 'object' && error.code) ? error.code : 'UNKNOWN_ERROR';
        
        generationStatus.error = {
          message: errorMessage,
          code: errorCode,
          timestamp: new Date(),
        };
        generationStatus.status = 'failed';
        // Log error for debugging
        console.error('Generation error reported:', {
          message: errorMessage,
          code: errorCode,
          userId: req.user._id
        });
      }

      if (status === 'completed') {
        generationStatus.completedAt = new Date();
      }

      await generationStatus.save();
    }

    // Log markdown length for debugging (but not the content itself)
    if (generationStatus.markdown) {
      console.log(`✅ Status saved with markdown (${generationStatus.markdown.length} chars), status: ${generationStatus.status}`);
    } else {
      console.log(`⚠️ Status saved without markdown, status: ${generationStatus.status}`);
    }

    // Broadcast update to SSE connections
    broadcastStatusUpdate(generationStatus.user, generationStatus).catch(err => {
      console.error('Failed to broadcast status update:', err);
    });

    res.status(200).json({
      success: true,
      status: generationStatus,
    });
  } catch (error) {
    console.error('Error in createOrUpdateStatus:', error);
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
    console.error('Error in createOrUpdateStatus:', error);
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
    console.error('Error in createOrUpdateStatus:', error);
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
    console.error('Error in createOrUpdateStatus:', error);
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
    console.error('Error in createOrUpdateStatus:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
};

// @desc    Stream generation status updates via Server-Sent Events
// @route   GET /api/generation-status/stream
// @access  Private
const streamStatus = async (req, res) => {
  const userId = req.user._id.toString();
  
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  
  // Store this connection
  if (!activeConnections.has(userId)) {
    activeConnections.set(userId, new Set());
  }
  activeConnections.get(userId).add(res);
  
  console.log(`✅ SSE connection opened for user ${userId} (total: ${activeConnections.get(userId).size})`);
  
  // Send initial status - ONLY active statuses (not completed/failed)
  // This prevents showing old completed/failed statuses when SSE connects
  try {
    const currentStatus = await GenerationStatus.findOne({
      user: req.user._id,
      status: { $in: ['pending', 'ingesting', 'scanning', 'indexing', 'generating', 'merging'] },
    }).sort({ createdAt: -1 });
    
    if (currentStatus) {
      console.log(`📡 SSE sending initial active status: ${currentStatus.status} (${currentStatus.progress}%)`);
      res.write(`data: ${JSON.stringify({ success: true, status: currentStatus })}\n\n`);
    } else {
      console.log('📡 SSE: No active status found, sending null');
      res.write(`data: ${JSON.stringify({ success: true, status: null })}\n\n`);
    }
  } catch (error) {
    console.error('Error sending initial status:', error);
    res.write(`data: ${JSON.stringify({ success: false, error: error.message })}\n\n`);
  }
  
  // Send heartbeat every 30 seconds to keep connection alive
  const heartbeatInterval = setInterval(() => {
    try {
      res.write(`: heartbeat\n\n`);
    } catch (error) {
      // Connection closed
      clearInterval(heartbeatInterval);
    }
  }, 30000);
  
  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(heartbeatInterval);
    const userConnections = activeConnections.get(userId);
    if (userConnections) {
      userConnections.delete(res);
      if (userConnections.size === 0) {
        activeConnections.delete(userId);
      }
    }
    console.log(`❌ SSE connection closed for user ${userId} (remaining: ${activeConnections.get(userId)?.size || 0})`);
  });
};

module.exports = {
  createOrUpdateStatus,
  getCurrentStatus,
  getHistory,
  getStatusById,
  cancelGeneration,
  streamStatus,
  broadcastStatusUpdate,
};

