const jwt = require('jsonwebtoken');

class AuthMiddleware {
  /**
   * Verify JWT token
   */
  verifyToken(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      const queryToken = typeof req.query.token === 'string' ? req.query.token : null;

      if (!authHeader && !queryToken) {
        return res.status(401).json({
          success: false,
          message: 'Token tidak ditemukan',
        });
      }

      const token = queryToken || authHeader.split(' ')[1]; // Bearer TOKEN

      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Token tidak valid',
        });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token sudah kedaluwarsa',
        });
      }

      return res.status(401).json({
        success: false,
        message: 'Token tidak valid',
      });
    }
  }

  /**
   * Check if user is admin
   */
  isAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak. Hanya admin yang dapat mengakses',
      });
    }
    next();
  }
}

module.exports = new AuthMiddleware();
