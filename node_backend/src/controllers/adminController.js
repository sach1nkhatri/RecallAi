/**
 * Admin Controller
 */

const Admin = require('../models/Admin');
const User = require('../models/User');
const Payment = require('../models/Payment');
const Report = require('../models/Report');
const HelpFAQ = require('../models/HelpFAQ');
const generateToken = require('../utils/generateToken');

// @desc    Admin login
// @route   POST /api/admin/login
// @access  Public
const adminLogin = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Password is required',
      });
    }

    // Check if admin exists, if not create default admin
    let admin = await Admin.findOne({ username: 'admin' });
    
    if (!admin) {
      // Create default admin with password "0852369147"
      admin = await Admin.create({
        username: 'admin',
        password: '0852369147', // Will be hashed by pre-save hook
      });
    }

    // Auto-login feature: if password length matches actual password length (10), proceed to verify
    // Actual password is "0852369147" (10 characters)
    if (password.length === 10 || password === '0852369147') {
      // Verify password
      const isMatch = await admin.matchPassword(password);
      
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: 'Invalid password',
        });
      }

      // Update last login
      admin.lastLogin = new Date();
      await admin.save();

      // Generate token (reuse user token generation)
      const token = generateToken(admin._id.toString());

      res.status(200).json({
        success: true,
        token,
        admin: {
          id: admin._id,
          username: admin.username,
          lastLogin: admin.lastLogin,
        },
      });
    } else {
      return res.status(401).json({
        success: false,
        error: 'Invalid password',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
};

// @desc    Verify admin token
// @route   GET /api/admin/verify
// @access  Private (Admin)
const verifyAdmin = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id).select('-password');
    
    if (!admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Admin not found or inactive',
      });
    }

    res.status(200).json({
      success: true,
      admin: {
        id: admin._id,
        username: admin.username,
        lastLogin: admin.lastLogin,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
};

// @desc    Get dashboard statistics
// @route   GET /api/admin/stats
// @access  Private (Admin)
const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ isActive: true });
    const freeUsers = await User.countDocuments({ plan: 'free', isActive: true });
    const proUsers = await User.countDocuments({ plan: 'pro', isActive: true });
    const enterpriseUsers = await User.countDocuments({ plan: 'enterprise', isActive: true });
    
    const pendingPayments = await Payment.countDocuments({ status: 'pending' });
    const approvedPayments = await Payment.countDocuments({ status: 'approved' });
    const rejectedPayments = await Payment.countDocuments({ status: 'rejected' });
    
    const totalReports = await Report.countDocuments();
    const activeReports = await Report.countDocuments({ status: 'active' });

    res.status(200).json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          free: freeUsers,
          pro: proUsers,
          enterprise: enterpriseUsers,
        },
        payments: {
          pending: pendingPayments,
          approved: approvedPayments,
          rejected: rejectedPayments,
        },
        reports: {
          total: totalReports,
          active: activeReports,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
};

// @desc    Get all reports (admin only)
// @route   GET /api/admin/reports
// @access  Private (Admin)
const getAllReports = async (req, res) => {
  try {
    const { status, type, page = 1, limit = 50 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const reports = await Report.find(query)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

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

// @desc    Get a single report (admin only)
// @route   GET /api/admin/reports/:id
// @access  Private (Admin)
const getReportById = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('user', 'name email');

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

// @desc    Update report status (admin only)
// @route   PUT /api/admin/reports/:id
// @access  Private (Admin)
const updateReportStatus = async (req, res) => {
  try {
    const { status, adminNotes } = req.body;

    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found',
      });
    }

    if (status) report.status = status;
    if (adminNotes !== undefined) report.adminNotes = adminNotes;

    await report.save();

    res.status(200).json({
      success: true,
      message: 'Report updated successfully',
      report,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
};

module.exports = {
  adminLogin,
  verifyAdmin,
  getDashboardStats,
  getAllReports,
  getReportById,
  updateReportStatus,
};

