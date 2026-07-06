const prisma = require('../utils/prisma');

// OTP model for database persistence
module.exports = {
  async create(email, otp) {
    const hashed = await bcrypt.hash(otp, 10);
    return prisma.otpToken.create({
      data: {
        email,
        hashedOtp: hashed,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      },
    });
  },

  async validate(email, otp) {
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
  },

  async deleteAllForEmail(email) {
    await prisma.otpToken.deleteMany({
      where: { email },
    });
  },
};