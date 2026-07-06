const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const authMiddleware = require('../middleware/authMiddleware');

// Public routes
router.get('/', categoryController.getAll);
router.get('/:id', categoryController.getById);

// Admin routes (protected)
router.post('/', authMiddleware.verifyToken, authMiddleware.isAdmin, categoryController.create);
router.put('/:id', authMiddleware.verifyToken, authMiddleware.isAdmin, categoryController.update);
router.delete('/:id', authMiddleware.verifyToken, authMiddleware.isAdmin, categoryController.delete);

module.exports = router;
