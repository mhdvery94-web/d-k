const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

// Public routes
router.get('/', menuController.getAll);
router.get('/:id', menuController.getById);

// Admin routes (protected)
router.post('/', authMiddleware.verifyToken, authMiddleware.isAdmin, menuController.create);
router.put('/:id', authMiddleware.verifyToken, authMiddleware.isAdmin, menuController.update);
router.delete('/:id', authMiddleware.verifyToken, authMiddleware.isAdmin, menuController.delete);

// Image upload (admin only)
router.post('/upload', authMiddleware.verifyToken, authMiddleware.isAdmin, upload.single('image'), menuController.uploadImage);

module.exports = router;
