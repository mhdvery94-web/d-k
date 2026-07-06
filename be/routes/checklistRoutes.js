const express = require('express');
const router = express.Router();
const checklistController = require('../controllers/checklistController');
const authMiddleware = require('../middleware/authMiddleware');

// POST /api/checklist/:orderId - Create checklist for order
router.post('/:orderId', authMiddleware.verifyToken, authMiddleware.isAdmin, checklistController.createChecklist);

// GET /api/checklist/:orderId - Get checklist for order
router.get('/:orderId', authMiddleware.verifyToken, authMiddleware.isAdmin, checklistController.getChecklistByOrderId);

// PUT /api/checklist/item/:id - Update checklist item
router.put('/item/:id', authMiddleware.verifyToken, authMiddleware.isAdmin, checklistController.updateChecklistItem);

// GET /api/checklist - Get all checklists
router.get('/', authMiddleware.verifyToken, authMiddleware.isAdmin, checklistController.getAllChecklists);

module.exports = router;