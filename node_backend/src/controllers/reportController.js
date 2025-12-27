/**
 * Report Controller
 */

const Report = require('../models/Report');
const { validationResult } = require('express-validator');

// @desc    Submit a new report
// @route   POST /api/reports
// @access  Private
const submitReport = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { type, subject, description, email } = req.body;

    const report = await Report.create({
      user: req.user._id,
      type,
      subject,
      description,
      email: email || req.user.email, // Use user's email if not provided
    });

    res.status(201).json({
      success: true,
      message: 'Report submitted successfully',
      report: {
        id: report._id,
        type: report.type,
        subject: report.subject,
        status: report.status,
        createdAt: report.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
};

// @desc    Get user's reports
// @route   GET /api/reports
// @access  Private
const getUserReports = async (req, res) => {
  try {
    const { status, type, page = 1, limit = 10 } = req.query;

    const query = { user: req.user._id };
    if (status) query.status = status;
    if (type) query.type = type;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const reports = await Report.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-adminNotes'); // Don't show admin notes to users

    const total = await Report.countDocuments(query);

    res.status(200).json({
      success: true,
      reports,
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

// @desc    Get a single report
// @route   GET /api/reports/:id
// @access  Private
const getReport = async (req, res) => {
  try {
    const report = await Report.findOne({
      _id: req.params.id,
      user: req.user._id,
    }).select('-adminNotes');

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found',
      });
    }

    res.status(200).json({
      success: true,
      report,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
};

// @desc    Update a report (user can only update their own)
// @route   PUT /api/reports/:id
// @access  Private
const updateReport = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { subject, description, email } = req.body;

    const report = await Report.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found',
      });
    }

    // Only allow updates if status is 'open'
    if (report.status !== 'open') {
      return res.status(400).json({
        success: false,
        error: 'Cannot update report that is not open',
      });
    }

    if (subject) report.subject = subject;
    if (description) report.description = description;
    if (email) report.email = email;

    await report.save();

    res.status(200).json({
      success: true,
      message: 'Report updated successfully',
      report: {
        id: report._id,
        type: report.type,
        subject: report.subject,
        status: report.status,
        updatedAt: report.updatedAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
};

// @desc    Delete a report
// @route   DELETE /api/reports/:id
// @access  Private
const deleteReport = async (req, res) => {
  try {
    const report = await Report.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found',
      });
    }

    await Report.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Report deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
};

module.exports = {
  submitReport,
  getUserReports,
  getReport,
  updateReport,
  deleteReport,
};

