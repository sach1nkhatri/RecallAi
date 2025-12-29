/**
 * Admin Routes
 */

const express = require('express');
const router = express.Router();
const {
  adminLogin,
  verifyAdmin,
  getDashboardStats,
  getAllReports,
  getReportById,
  updateReportStatus,
} = require('../controllers/adminController');
const {
  getAllUsers,
  getUserById,
  updateUserPlan,
  updateUserStatus,
  getUserStats,
} = require('../controllers/userManagementController');
const {
  getAllPayments,
  getPaymentById,
  approvePayment,
  rejectPayment,
} = require('../controllers/paymentController');
const {
  getAllFAQsAdmin,
  createFAQ,
  updateFAQ,
  deleteFAQ,
} = require('../controllers/helpFAQController');
const { protectAdmin } = require('../middleware/adminAuth');

// Public admin routes
router.post('/login', adminLogin);

// Protected admin routes
router.use(protectAdmin);

router.get('/verify', verifyAdmin);
router.get('/stats', getDashboardStats);

// User management
router.get('/users', getAllUsers);
router.get('/users/stats', getUserStats);
router.get('/users/:id', getUserById);
router.put('/users/:id/plan', updateUserPlan);
router.put('/users/:id/status', updateUserStatus);

// Payment management
router.get('/payments', getAllPayments);
router.get('/payments/:id', getPaymentById);
router.put('/payments/:id/approve', approvePayment);
router.put('/payments/:id/reject', rejectPayment);

// Help/FAQ management
router.get('/help-faq', getAllFAQsAdmin);
router.post('/help-faq', createFAQ);
router.put('/help-faq/:id', updateFAQ);
router.delete('/help-faq/:id', deleteFAQ);

// Report management
router.get('/reports', getAllReports);
router.get('/reports/:id', getReportById);
router.put('/reports/:id', updateReportStatus);

module.exports = router;

