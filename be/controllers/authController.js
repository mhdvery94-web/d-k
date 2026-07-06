const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const prisma = require('../utils/prisma');
const emailService = require('../services/emailService');

class AuthController {
  async login(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username dan password harus diisi' });
      }

      const user = await prisma.user.findUnique({ where: { username } });
      if (!user) return res.status(401).json({ success: false, message: 'Username atau password salah' });

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) return res.status(401).json({ success: false, message: 'Username atau password salah' });

      const token = jwt.sign(
        { userId: user.id, username: user.username, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        success: true,
        message: 'Login berhasil',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
    }
  }

  async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ success: false, message: 'Email harus diisi' });

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return res.status(404).json({ success: false, message: 'Email tidak ditemukan' });

      const otp = emailService.generateOTP();
      await emailService.storeOTP(email, otp);
      await emailService.sendOTP(email, otp, 'reset-password');

      res.json({ success: true, message: 'Kode OTP telah dikirim ke email Anda' });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ success: false, message: 'Gagal mengirim OTP' });
    }
  }

  async resetPassword(req, res) {
    try {
      const { email, otp, newPassword } = req.body;
      if (!email || !otp || !newPassword) {
        return res.status(400).json({ success: false, message: 'Email, OTP, dan password baru harus diisi' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ success: false, message: 'Password minimal 6 karakter' });
      }

      const isValidOtp = await emailService.validateOTP(email, otp);
      if (!isValidOtp) {
        return res.status(400).json({ success: false, message: 'OTP tidak valid atau sudah kedaluwarsa' });
      }

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({ where: { email }, data: { passwordHash: hashedPassword } });

      res.json({ success: true, message: 'Password berhasil direset' });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ success: false, message: 'Gagal mereset password' });
    }
  }

  async forgotUsername(req, res) {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ success: false, message: 'Email harus diisi' });

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return res.status(404).json({ success: false, message: 'Email tidak ditemukan' });

      const otp = emailService.generateOTP();
      await emailService.storeOTP(email, otp);
      await emailService.sendOTP(email, otp, 'forgot-username');

      res.json({ success: true, message: 'Kode OTP telah dikirim ke email Anda' });
    } catch (error) {
      console.error('Forgot username error:', error);
      res.status(500).json({ success: false, message: 'Gagal mengirim OTP' });
    }
  }

  async getUsername(req, res) {
    try {
      const { email, otp } = req.body;
      if (!email || !otp) return res.status(400).json({ success: false, message: 'Email dan OTP harus diisi' });

      const isValidOtp = await emailService.validateOTP(email, otp);
      if (!isValidOtp) {
        return res.status(400).json({ success: false, message: 'OTP tidak valid atau sudah kedaluwarsa' });
      }

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });

      res.json({ success: true, message: 'Username berhasil ditemukan', username: user.username });
    } catch (error) {
      console.error('Get username error:', error);
      res.status(500).json({ success: false, message: 'Gagal mendapatkan username' });
    }
  }

  async getProfile(req, res) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { id: true, username: true, email: true, name: true, role: true, createdAt: true },
      });

      if (!user) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
      res.json({ success: true, user });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ success: false, message: 'Gagal mengambil profil' });
    }
  }
}

module.exports = new AuthController();
