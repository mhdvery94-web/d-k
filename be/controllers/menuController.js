const prisma = require('../utils/prisma');
const path = require('path');
const fs = require('fs');
const { success, error, created, notFound } = require('../utils/response');
const { validateMenuData, sanitizeString } = require('../utils/validators');

class MenuController {
  // GET /api/menus - Get all menus (public)
  async getAll(req, res) {
    try {
      const { categoryId, search } = req.query;
      
      const where = { isActive: true };
      
      if (categoryId) {
        where.categoryId = parseInt(categoryId);
      }
      
      if (search) {
        where.name = { contains: search };
      }

      const menus = await prisma.menu.findMany({
        where,
        include: {
          category: true
        },
        orderBy: { name: 'asc' }
      });

      res.json({
        success: true,
        message: 'Berhasil mengambil semua menu',
        data: menus
      });
    } catch (error) {
      console.error('Get all menus error:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal mengambil menu'
      });
    }
  }

  // GET /api/menus/:id - Get menu by ID (public)
  async getById(req, res) {
    try {
      const { id } = req.params;
      const menu = await prisma.menu.findUnique({
        where: { id: parseInt(id) },
        include: { category: true }
      });

      if (!menu) {
        return res.status(404).json({
          success: false,
          message: 'Menu tidak ditemukan'
        });
      }

      res.json({
        success: true,
        message: 'Berhasil mengambil menu',
        data: menu
      });
    } catch (error) {
      console.error('Get menu by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal mengambil menu'
      });
    }
  }

  // POST /api/menus - Create menu (admin only)
  async create(req, res) {
    try {
      const { categoryId, name, description, price, discountPercent, stock, imageUrl } = req.body;

      // Validation
      if (!categoryId || !name || !price) {
        return res.status(400).json({
          success: false,
          message: 'Kategori, nama, dan harga harus diisi'
        });
      }

      // Check if category exists
      const category = await prisma.category.findUnique({
        where: { id: parseInt(categoryId) }
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Kategori tidak ditemukan'
        });
      }

      const menu = await prisma.menu.create({
        data: {
          categoryId: parseInt(categoryId),
          name,
          description: description || '',
          price: parseFloat(price),
          discountPercent: discountPercent ? parseInt(discountPercent) : 0,
          stock: stock ? parseInt(stock) : 0,
          imageUrl: imageUrl || null
        }
      });

      res.status(201).json({
        success: true,
        message: 'Berhasil membuat menu',
        data: menu
      });
    } catch (error) {
      console.error('Create menu error:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal membuat menu'
      });
    }
  }

  // PUT /api/menus/:id - Update menu (admin only)
  async update(req, res) {
    try {
      const { id } = req.params;
      const { categoryId, name, description, price, discountPercent, stock, imageUrl } = req.body;

      const menu = await prisma.menu.findUnique({
        where: { id: parseInt(id) }
      });

      if (!menu) {
        return res.status(404).json({
          success: false,
          message: 'Menu tidak ditemukan'
        });
      }

      // Check if category exists (if categoryId is being changed)
      if (categoryId) {
        const category = await prisma.category.findUnique({
          where: { id: parseInt(categoryId) }
        });

        if (!category) {
          return res.status(404).json({
            success: false,
            message: 'Kategori tidak ditemukan'
          });
        }
      }

      const updated = await prisma.menu.update({
        where: { id: parseInt(id) },
        data: {
          ...(categoryId && { categoryId: parseInt(categoryId) }),
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(price && { price: parseFloat(price) }),
          ...(discountPercent !== undefined && { discountPercent: parseInt(discountPercent) }),
          ...(stock !== undefined && { stock: parseInt(stock) }),
          ...(imageUrl !== undefined && { imageUrl })
        }
      });

      res.json({
        success: true,
        message: 'Berhasil mengupdate menu',
        data: updated
      });
    } catch (error) {
      console.error('Update menu error:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal mengupdate menu'
      });
    }
  }

  // DELETE /api/menus/:id - Delete menu (admin only)
  async delete(req, res) {
    try {
      const { id } = req.params;

      const menu = await prisma.menu.findUnique({
        where: { id: parseInt(id) }
      });

      if (!menu) {
        return res.status(404).json({
          success: false,
          message: 'Menu tidak ditemukan'
        });
      }

      // Delete uploaded image file if it belongs to local uploads.
      if (menu.imageUrl && String(menu.imageUrl).startsWith('/uploads/')) {
        const imagePath = path.join(__dirname, '..', menu.imageUrl);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }

      await prisma.menu.update({
        where: { id: parseInt(id) },
        data: { isActive: false }
      });

      res.json({
        success: true,
        message: 'Berhasil menghapus menu'
      });
    } catch (error) {
      console.error('Delete menu error:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal menghapus menu'
      });
    }
  }

  // POST /api/menus/upload - Upload menu image (admin only)
  async uploadImage(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Tidak ada file yang diupload'
        });
      }

      const imageUrl = `/uploads/${req.file.filename}`;

      res.json({
        success: true,
        message: 'Berhasil mengupload gambar',
        data: { imageUrl }
      });
    } catch (error) {
      console.error('Upload image error:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal mengupload gambar'
      });
    }
  }
}

module.exports = new MenuController();
