const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const { loginLimiter, otpLimiter } = require('../middleware/rateLimiter');

// POST /api/auth/login - Admin login
router.post('/login', loginLimiter, authController.login);

// POST /api/auth/logout - Admin logout (JWT is stateless, just return success)
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logout berhasil',
  });
});

// GET /api/auth/me - Get current admin info (protected)
router.get('/me', authMiddleware.verifyToken, authController.getProfile);

// POST /api/auth/forgot-password - Send OTP to email
router.post('/forgot-password', otpLimiter, authController.forgotPassword);

// POST /api/auth/reset-password - Verify OTP and reset password
router.post('/reset-password', authController.resetPassword);

// POST /api/auth/forgot-username - Send OTP to email
router.post('/forgot-username', otpLimiter, authController.forgotUsername);

// POST /api/auth/get-username - Verify OTP and return username
router.post('/get-username', authController.getUsername);

module.exports = router;
