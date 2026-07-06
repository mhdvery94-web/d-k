const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/authMiddleware');

// GET /api/dashboard/stats - Get dashboard statistics
router.get('/stats', authMiddleware.verifyToken, authMiddleware.isAdmin, dashboardController.getStats);

module.exports = router;
