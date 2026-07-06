/**
 * Model: Category
 * Blueprint dari tabel `categories` di database
 *
 * Fields:
 * - id:        INT AUTO_INCREMENT PRIMARY KEY
 * - name:      VARCHAR(100) UNIQUE NOT NULL
 * - icon:      VARCHAR(10) NULL
 * - isActive:  BOOLEAN DEFAULT TRUE
 * - createdAt: TIMESTAMP DEFAULT NOW()
 * - updatedAt: TIMESTAMP ON UPDATE NOW()
 *
 * Relasi:
 * - Category 1:N Menu (satu kategori punya banyak menu)
 */

const prisma = require('../utils/prisma');

class CategoryModel {
  async findAll(includeMenus = false) {
    return prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: includeMenus
        ? { menus: { where: { isActive: true } } }
        : { _count: { select: { menus: true } } },
    });
  }

  async findById(id, includeMenus = false) {
    return prisma.category.findUnique({
      where: { id },
      include: includeMenus
        ? { menus: { where: { isActive: true } } }
        : false,
    });
  }

  async findByName(name) {
    return prisma.category.findUnique({ where: { name } });
  }

  async create(data) {
    return prisma.category.create({
      data: {
        name: data.name,
        icon: data.icon || 'CT',
      },
    });
  }

  async update(id, data) {
    return prisma.category.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.icon && { icon: data.icon }),
      },
    });
  }

  async delete(id) {
    return prisma.category.delete({ where: { id } });
  }

  async countMenus(id) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { menus: true } } },
    });
    return category?._count?.menus ?? 0;
  }
}

module.exports = new CategoryModel();
