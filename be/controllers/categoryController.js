const prisma = require('../utils/prisma');
const { success, error, created, notFound } = require('../utils/response');

class CategoryController {
  // GET /api/categories - Get all categories (public)
  async getAll(req, res) {
    try {
      const categories = await prisma.category.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { menus: true }
          }
        }
      });

      res.json({
        success: true,
        message: 'Berhasil mengambil semua kategori',
        data: categories
      });
    } catch (error) {
      console.error('Get all categories error:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal mengambil kategori'
      });
    }
  }

  // GET /api/categories/:id - Get category by ID (public)
  async getById(req, res) {
    try {
      const { id } = req.params;
      const category = await prisma.category.findUnique({
        where: { id: parseInt(id) },
        include: {
          menus: {
            where: { isActive: true }
          }
        }
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Kategori tidak ditemukan'
        });
      }

      res.json({
        success: true,
        message: 'Berhasil mengambil kategori',
        data: category
      });
    } catch (error) {
      console.error('Get category by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal mengambil kategori'
      });
    }
  }

  // POST /api/categories - Create category (admin only)
  async create(req, res) {
    try {
      const { name, icon } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Nama kategori harus diisi'
        });
      }

      // Check if category already exists
      const existing = await prisma.category.findUnique({
        where: { name }
      });

      if (existing) {
        if (!existing.isActive) {
          const restored = await prisma.category.update({
            where: { id: existing.id },
            data: {
              icon: icon || existing.icon || 'CT',
              isActive: true
            }
          });

          return res.status(201).json({
            success: true,
            message: 'Berhasil membuat kategori',
            data: restored
          });
        }

        return res.status(400).json({
          success: false,
          message: 'Kategori sudah ada'
        });
      }

      const category = await prisma.category.create({
        data: {
          name,
          icon: icon || 'CT'
        }
      });

      res.status(201).json({
        success: true,
        message: 'Berhasil membuat kategori',
        data: category
      });
    } catch (error) {
      console.error('Create category error:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal membuat kategori'
      });
    }
  }

  // PUT /api/categories/:id - Update category (admin only)
  async update(req, res) {
    try {
      const { id } = req.params;
      const { name, icon } = req.body;

      const category = await prisma.category.findUnique({
        where: { id: parseInt(id) }
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Kategori tidak ditemukan'
        });
      }

      // Check if new name already exists (if name is being changed)
      if (name && name !== category.name) {
        const existing = await prisma.category.findUnique({
          where: { name }
        });

        if (existing && existing.id !== category.id && existing.isActive) {
          return res.status(400).json({
            success: false,
            message: 'Nama kategori sudah ada'
          });
        }
      }

      const updated = await prisma.category.update({
        where: { id: parseInt(id) },
        data: {
          ...(name && { name }),
          ...(icon && { icon })
        }
      });

      res.json({
        success: true,
        message: 'Berhasil mengupdate kategori',
        data: updated
      });
    } catch (error) {
      console.error('Update category error:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal mengupdate kategori'
      });
    }
  }

  // DELETE /api/categories/:id - Delete category (admin only)
  async delete(req, res) {
    try {
      const { id } = req.params;

      const category = await prisma.category.findUnique({
        where: { id: parseInt(id) },
        include: {
          _count: {
            select: { menus: true }
          }
        }
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Kategori tidak ditemukan'
        });
      }

      await prisma.$transaction(async (tx) => {
        await tx.menu.updateMany({
          where: { categoryId: parseInt(id), isActive: true },
          data: { isActive: false }
        });

        await tx.category.update({
          where: { id: parseInt(id) },
          data: { isActive: false }
        });
      });

      res.json({
        success: true,
        message: category._count.menus > 0
          ? 'Berhasil menghapus kategori dan menyembunyikan menu terkait'
          : 'Berhasil menghapus kategori'
      });
    } catch (error) {
      console.error('Delete category error:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal menghapus kategori'
      });
    }
  }
}

module.exports = new CategoryController();
