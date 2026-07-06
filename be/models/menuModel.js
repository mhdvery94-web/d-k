/**
 * Model: Menu
 * Blueprint dari tabel `menus` di database
 *
 * Fields:
 * - id:              INT AUTO_INCREMENT PRIMARY KEY
 * - categoryId:      INT NOT NULL (FK -> categories.id)
 * - name:            VARCHAR(200) NOT NULL
 * - description:     TEXT NULL
 * - price:           DECIMAL(10,2) NOT NULL
 * - discountPercent: INT DEFAULT 0 (0 = tidak ada diskon)
 * - stock:           INT DEFAULT 0
 * - imageUrl:        VARCHAR(500) NULL
 * - isActive:        BOOLEAN DEFAULT TRUE
 * - createdAt:       TIMESTAMP DEFAULT NOW()
 * - updatedAt:       TIMESTAMP ON UPDATE NOW()
 *
 * Relasi:
 * - Menu N:1 Category (banyak menu dalam satu kategori)
 * - Menu 1:N OrderItem (satu menu bisa ada di banyak order)
 */

const prisma = require('../utils/prisma');

class MenuModel {
  async findAll(filters = {}) {
    const where = { isActive: true };

    if (filters.categoryId) {
      where.categoryId = parseInt(filters.categoryId);
    }

    if (filters.search) {
      where.name = { contains: filters.search };
    }

    return prisma.menu.findMany({
      where,
      include: { category: true },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id) {
    return prisma.menu.findUnique({
      where: { id: parseInt(id) },
      include: { category: true },
    });
  }

  async create(data) {
    return prisma.menu.create({
      data: {
        categoryId: parseInt(data.categoryId),
        name: data.name,
        description: data.description || '',
        price: parseFloat(data.price),
        discountPercent: data.discountPercent ? parseInt(data.discountPercent) : 0,
        stock: data.stock ? parseInt(data.stock) : 0,
        imageUrl: data.imageUrl || null,
      },
    });
  }

  async update(id, data) {
    return prisma.menu.update({
      where: { id: parseInt(id) },
      data: {
        ...(data.categoryId && { categoryId: parseInt(data.categoryId) }),
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.price && { price: parseFloat(data.price) }),
        ...(data.discountPercent !== undefined && { discountPercent: parseInt(data.discountPercent) }),
        ...(data.stock !== undefined && { stock: parseInt(data.stock) }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
      },
    });
  }

  async delete(id) {
    return prisma.menu.delete({ where: { id: parseInt(id) } });
  }

  /**
   * Decrement stock dengan transaction (untuk concurrency handling)
   * Dipakai saat payment success
   */
  async decrementStock(tx, menuId, quantity) {
    return tx.menu.update({
      where: { id: menuId },
      data: { stock: { decrement: quantity } },
    });
  }

  /**
   * Get stock untuk multiple menu IDs (dengan lock)
   */
  async getStockForUpdate(tx, menuIds) {
    return tx.$queryRaw`
      SELECT id, stock FROM menus
      WHERE id IN (${menuIds.join(',')})
      FOR UPDATE
    `;
  }
}

module.exports = new MenuModel();
