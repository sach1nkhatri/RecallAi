/**
 * Settings Routes
 */

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getSettings,
  updateSettings,
  resetSettings,
} = require('../controllers/settingsController');
const { protect } = require('../middleware/auth');

// Validation rules
const updateSettingsValidation = [
  body('theme')
    .optional()
    .isIn(['light', 'dark', 'auto'])
    .withMessage('Invalid theme value'),
  body('language').optional().isString().withMessage('Language must be a string'),
  body('notifications.email').optional().isBoolean().withMessage('Email notification must be boolean'),
  body('notifications.inApp').optional().isBoolean().withMessage('In-app notification must be boolean'),
  body('notifications.usageAlerts').optional().isBoolean().withMessage('Usage alerts must be boolean'),
  body('codeToDoc.defaultMode')
    .optional()
    .isIn(['upload', 'github'])
    .withMessage('Invalid code-to-doc mode'),
  body('codeToDoc.autoGenerate').optional().isBoolean().withMessage('Auto-generate must be boolean'),
  body('codeToDoc.maxFiles').optional().isInt({ min: 1, max: 10 }).withMessage('Max files must be between 1 and 10'),
  body('bot.defaultModel').optional().isString().withMessage('Default model must be a string'),
  body('bot.temperature').optional().isFloat({ min: 0, max: 2 }).withMessage('Temperature must be between 0 and 2'),
];

// All routes are protected
router.use(protect);

router.get('/', getSettings);
router.put('/', updateSettingsValidation, updateSettings);
router.post('/reset', resetSettings);

module.exports = router;

