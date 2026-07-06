const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const prisma = require('../utils/prisma');
require('dotenv').config();

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT, 10),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async storeOTP(email, otp) {
    const hashed = await bcrypt.hash(otp, 10);
    await prisma.otpToken.deleteMany({
      where: { email, used: false },
    });

    return prisma.otpToken.create({
      data: {
        email,
        hashedOtp: hashed,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });
  }

  async validateOTP(email, otp) {
    const token = await prisma.otpToken.findFirst({
      where: {
        email,
        used: false,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!token) return false;

    if (token.attempts >= 5) {
      await prisma.otpToken.update({
        where: { id: token.id },
        data: { used: true },
      });
      return false;
    }

    const isValid = await bcrypt.compare(otp, token.hashedOtp);
    if (!isValid) {
      await prisma.otpToken.update({
        where: { id: token.id },
        data: { attempts: { increment: 1 } },
      });
      return false;
    }

    await prisma.otpToken.update({
      where: { id: token.id },
      data: { used: true },
    });
    return true;
  }

  async sendOTP(email, otp, type = 'reset-password') {
    const subject = type === 'reset-password'
      ? 'Reset Password - Dapur Kemas'
      : 'Lupa Username - Dapur Kemas';

    const title = type === 'reset-password'
      ? 'Reset Password Anda'
      : 'Lupa Username Anda';

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject,
      text: `Kode OTP Anda adalah: ${otp}\n\nKode ini berlaku selama 15 menit.\nJangan bagikan kode ini ke siapa pun.\n\nTerima kasih,\nTim Dapur Kemas`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden;">
          <div style="background: #1D4ED8; color: white; padding: 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">DAPUR - KEMAS</h1>
            <p style="margin: 6px 0 0;">Aplikasi Pemesanan Makanan</p>
          </div>
          <div style="padding: 28px; color: #1E293B;">
            <h2 style="margin-top: 0;">${title}</h2>
            <p>Gunakan kode OTP berikut untuk melanjutkan:</p>
            <div style="margin: 24px 0; padding: 18px; background: #EFF6FF; border: 2px dashed #3B82F6; border-radius: 10px; text-align: center;">
              <strong style="font-size: 34px; letter-spacing: 8px; color: #1D4ED8;">${otp}</strong>
            </div>
            <p>Kode ini berlaku selama <strong>15 menit</strong>.</p>
            <p>Jangan bagikan kode ini ke siapa pun.</p>
          </div>
        </div>
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Email send failed:', error.message);
      throw new Error('Gagal mengirim email OTP');
    }
  }
}

module.exports = new EmailService();
