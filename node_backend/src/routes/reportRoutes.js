/**
 * Report Routes
 */

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  submitReport,
  getUserReports,
  getReport,
  updateReport,
  deleteReport,
} = require('../controllers/reportController');
const { protect } = require('../middleware/auth');

// Validation rules
const submitReportValidation = [
  body('type')
    .isIn(['bug', 'feature', 'improvement', 'other'])
    .withMessage('Invalid report type'),
  body('subject')
    .trim()
    .notEmpty()
    .withMessage('Subject is required')
    .isLength({ max: 200 })
    .withMessage('Subject cannot exceed 200 characters'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ max: 5000 })
    .withMessage('Description cannot exceed 5000 characters'),
  body('email').optional().isEmail().withMessage('Please provide a valid email'),
];

const updateReportValidation = [
  body('subject')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Subject cannot be empty')
    .isLength({ max: 200 })
    .withMessage('Subject cannot exceed 200 characters'),
  body('description')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Description cannot be empty')
    .isLength({ max: 5000 })
    .withMessage('Description cannot exceed 5000 characters'),
  body('email').optional().isEmail().withMessage('Please provide a valid email'),
];

// All routes are protected
router.use(protect);

router.post('/', submitReportValidation, submitReport);
router.get('/', getUserReports);
router.get('/:id', getReport);
router.put('/:id', updateReportValidation, updateReport);
router.delete('/:id', deleteReport);

module.exports = router;

