/**
 * Payment Routes
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getMyPayments } = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');
const Payment = require('../models/Payment');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads/payments');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `payment-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// @desc    Submit payment with screenshot
// @route   POST /api/payments/submit
// @access  Private
router.post('/submit', protect, upload.single('screenshot'), async (req, res) => {
  try {
    const { plan, planDuration, amount, paymentMethod } = req.body;

    if (!plan || !planDuration || !amount || !paymentMethod || !req.file) {
      return res.status(400).json({
        success: false,
        error: 'Plan, duration, amount, payment method, and screenshot are required',
      });
    }

    // Calculate validity date
    const days = planDuration === 'daily' ? 1 : planDuration === 'weekly' ? 7 : 30;
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + days);

    // Create payment record
    const payment = await Payment.create({
      userId: req.user._id,
      plan,
      planDuration,
      amount: parseFloat(amount),
      paymentMethod,
      screenshot: `uploads/payments/${req.file.filename}`,
      validUntil,
      status: 'pending',
    });

    res.status(201).json({
      success: true,
      payment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
});

// Get user's payments
router.get('/my-payments', protect, getMyPayments);

module.exports = router;

