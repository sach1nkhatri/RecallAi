/**
 * Generation Status Routes
 */

const express = require('express');
const router = express.Router();
const {
  createOrUpdateStatus,
  getCurrentStatus,
  getHistory,
  getStatusById,
  cancelGeneration,
} = require('../controllers/generationStatusController');
const { protect } = require('../middleware/auth');

// All routes are protected
router.use(protect);

router.post('/', createOrUpdateStatus);
router.get('/current', getCurrentStatus);
router.get('/history', getHistory);
router.get('/:id', getStatusById);
router.delete('/:id', cancelGeneration);

module.exports = router;

