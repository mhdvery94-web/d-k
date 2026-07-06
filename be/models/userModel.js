/**
 * Model: User (Admin)
 * Blueprint dari tabel `users` di database
 *
 * Tabel ini hanya untuk admin. Customer tidak punya akun.
 * Email & password disimpan di DB, dicek saat login.
 *
 * Fields:
 * - id:           INT AUTO_INCREMENT PRIMARY KEY
 * - username:     VARCHAR(50) UNIQUE NOT NULL
 * - email:        VARCHAR(100) UNIQUE NOT NULL
 * - passwordHash: VARCHAR(255) NOT NULL (bcrypt hash)
 * - name:         VARCHAR(100) NULL
 * - role:         VARCHAR(20) DEFAULT 'admin'
 * - createdAt:    TIMESTAMP DEFAULT NOW()
 * - updatedAt:    TIMESTAMP ON UPDATE NOW()
 *
 * Relasi: Tidak ada (standalone)
 */

const prisma = require('../utils/prisma');
const bcrypt = require('bcryptjs');

class UserModel {
  async findByUsername(username) {
    return prisma.user.findUnique({ where: { username } });
  }

  async findByEmail(email) {
    return prisma.user.findUnique({ where: { email } });
  }

  async findById(id) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  async updatePassword(email, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    return prisma.user.update({
      where: { email },
      data: { passwordHash: hashedPassword },
    });
  }
}

module.exports = new UserModel();
