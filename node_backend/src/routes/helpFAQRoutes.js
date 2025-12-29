/**
 * Help and FAQ Routes
 */

const express = require('express');
const router = express.Router();
const { getAllFAQs } = require('../controllers/helpFAQController');

// Public route - get all active FAQs
router.get('/', getAllFAQs);

module.exports = router;

