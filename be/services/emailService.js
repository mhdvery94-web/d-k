const bcrypt = require('bcryptjs');
const prisma = require('../utils/prisma');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

const prisma = require('../utils/prisma');

  /**
   * Store OTP in database
   */
  async storeOTP(email, otp) {
    const hashed = await bcrypt.hash(otp, 10);
    return prisma.otpToken.create({
      data: {
        email,
        hashedOtp: hashed,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      },
    });
  }

  /**
   * Send OTP email
   */
  async sendOTP(email, otp, type = 'reset-password') {
    const subject = type === 'reset-password' 
      ? 'Reset Password - Dapur Kemas' 
      : 'Lupa Username - Dapur Kemas';

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject,
      text: `Kode OTP Anda adalah: ${otp}\n\nKode ini berlaku selama 15 menit.\nJangan bagikan kode ini ke siapa pun.\n\nTerima kasih,\nTim Dapur Kemas`,
      html: `<p>Kode OTP Anda adalah: <strong>${otp}</strong></p><p>Kode ini berlaku selama <strong>15 menit</strong>.</p><p>Jangan bagikan kode ini ke siapa pun.</p><p>Terima kasih,<br>Tim Dapur Kemas</p>`
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Email send failed:', error.message);
      throw new Error('Gagal mengirim email OTP');
    }
  }

  /**
   * Store OTP in database
   */
  async storeOTP(email, otp) {
    const hashed = await bcrypt.hash(otp, 10);
    return prisma.otpToken.create({
      data: {
        email,
        hashedOtp: hashed,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      },
    });
  }

  /**
   * Validate OTP from database
   */
  async validateOTP(email, otp) {
    const token = await prisma.otpToken.findFirst({
      where: {
        email,
        used: false,
        expiresAt: { gte: new Date() },
      },
    });

    if (!token) return false;

    const isValid = await bcrypt.compare(otp, token.hashedOtp);
    if (isValid) {
      await prisma.otpToken.update({
        where: { id: token.id },
        data: { used: true },
      });
    }

    return isValid;
  }

    return isValid;
  }
    const subject = type === 'reset-password' 
      ? 'Reset Password - Dapur Kemas' 
      : 'Lupa Username - Dapur Kemas';

    const title = type === 'reset-password'
      ? 'Reset Password Anda'
      : 'Lupa Username Anda';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          .header {
            background-color: #1D4ED8;
            color: white;
            padding: 30px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 800;
            letter-spacing: 2px;
          }
          .header p {
            margin: 5px 0 0 0;
            font-size: 14px;
            opacity: 0.9;
          }
          .content {
            padding: 40px 30px;
          }
          .content h2 {
            color: #1E293B;
            font-size: 22px;
            margin: 0 0 20px 0;
          }
          .content p {
            color: #64748B;
            font-size: 15px;
            line-height: 1.6;
            margin: 0 0 20px 0;
          }
          .otp-box {
            background-color: #EFF6FF;
            border: 2px dashed #3B82F6;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 30px 0;
          }
          .otp-code {
            font-size: 36px;
            font-weight: 700;
            color: #1D4ED8;
            letter-spacing: 8px;
            font-family: 'Courier New', monospace;
          }
          .warning {
            background-color: #FEF2F2;
            border-left: 4px solid #EF4444;
            padding: 15px;
            border-radius: 4px;
            margin: 20px 0;
          }
          .warning p {
            color: #991B1B;
            font-size: 13px;
            margin: 0;
          }
          .footer {
            background-color: #F8FAFC;
            padding: 20px 30px;
            text-align: center;
            border-top: 1px solid #E2E8F0;
          }
          .footer p {
            color: #94A3B8;
            font-size: 12px;
            margin: 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>DAPUR - KEMAS</h1>
            <p>Aplikasi Pemesanan Makanan</p>
          </div>
          <div class="content">
            <h2>${title}</h2>
            <p>Halo Admin Dapur Kemas,</p>
            <p>Kami menerima permintaan untuk ${type === 'reset-password' ? 'mereset password' : 'melihat username'} Anda. Gunakan kode OTP berikut untuk melanjutkan:</p>
            
            <div class="otp-box">
              <div class="otp-code">${otp}</div>
            </div>
            
            <p>Kode OTP ini akan berlaku selama <strong>10 menit</strong>. Jangan bagikan kode ini kepada siapapun.</p>
            
            <div class="warning">
              <p><strong>⚠️ Peringatan:</strong> Jika Anda tidak merasa meminta reset password atau lupa username, abaikan email ini. Akun Anda tetap aman.</p>
            </div>
          </div>
          <div class="footer">
            <p>© 2026 Dapur Kemas. Email ini dikirim secara otomatis.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject,
      html,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Email send failed:', error.message);
      throw new Error('Gagal mengirim email OTP');
    }
  }
}

module.exports = new EmailService();
