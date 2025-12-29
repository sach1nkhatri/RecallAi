/**
 * Payment Controller
 */

const Payment = require('../models/Payment');
const User = require('../models/User');

// @desc    Get all payments
// @route   GET /api/admin/payments
// @access  Private (Admin)
const getAllPayments = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    const query = {};
    if (status) {
      query.status = status;
    }

    const payments = await Payment.find(query)
      .populate('userId', 'name email plan')
      .populate('reviewedBy', 'username')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Payment.countDocuments(query);

    res.status(200).json({
      success: true,
      payments,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
};

// @desc    Get payment by ID
// @route   GET /api/admin/payments/:id
// @access  Private (Admin)
const getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('userId', 'name email plan')
      .populate('reviewedBy', 'username');

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found',
      });
    }

    res.status(200).json({
      success: true,
      payment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
};

// @desc    Approve payment
// @route   PUT /api/admin/payments/:id/approve
// @access  Private (Admin)
const approvePayment = async (req, res) => {
  try {
    const { adminNotes } = req.body;
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found',
      });
    }

    if (payment.status === 'approved') {
      return res.status(400).json({
        success: false,
        error: 'Payment already approved',
      });
    }

    // Update payment status
    payment.status = 'approved';
    payment.reviewedBy = req.admin._id;
    payment.reviewedAt = new Date();
    if (adminNotes) {
      payment.adminNotes = adminNotes;
    }
    await payment.save();

    // Update user plan
    const user = await User.findById(payment.userId);
    if (user) {
      user.plan = payment.plan;
      await user.save();
    }

    res.status(200).json({
      success: true,
      payment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
};

// @desc    Reject payment
// @route   PUT /api/admin/payments/:id/reject
// @access  Private (Admin)
const rejectPayment = async (req, res) => {
  try {
    const { adminNotes } = req.body;
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found',
      });
    }

    payment.status = 'rejected';
    payment.reviewedBy = req.admin._id;
    payment.reviewedAt = new Date();
    if (adminNotes) {
      payment.adminNotes = adminNotes;
    }
    await payment.save();

    res.status(200).json({
      success: true,
      payment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
};

// @desc    Get user payments
// @route   GET /api/payments/my-payments
// @access  Private
const getMyPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.user._id })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      payments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
};

module.exports = {
  getAllPayments,
  getPaymentById,
  approvePayment,
  rejectPayment,
  getMyPayments,
};

