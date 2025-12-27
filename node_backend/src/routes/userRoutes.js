/**
 * User Routes
 */

const express = require('express');
const router = express.Router();
const {
  getUsage,
  incrementUsage,
  updatePlan,
  deleteAccount,
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');

// All routes are protected
router.use(protect);

router.get('/usage', getUsage);
router.post('/usage/increment', incrementUsage);
router.put('/plan', updatePlan);
router.delete('/account', deleteAccount);

module.exports = router;

