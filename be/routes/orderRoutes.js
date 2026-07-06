const express = require('express');
const router = express.Router();
const orderModel = require('../models/orderModel');
const authMiddleware = require('../middleware/authMiddleware');
const { normalizePhone } = require('../utils/validators');
const prisma = require('../utils/prisma');

// IMPORTANT: /track/:orderNumber harus SEBELUM /:id agar tidak tertangkap sebagai :id

const allowedTransitions = {
  confirmed: ['preparing', 'cancelled'],
  preparing: ['packaging', 'delivering', 'cancelled'],
  packaging: ['delivering', 'cancelled'],
  delivering: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

// GET /api/orders/track-by-phone/:phone - Track orders by phone (public)
router.get('/track-by-phone/:phone', async (req, res, next) => {
  try {
    const phone = normalizePhone(req.params.phone);
    if (!phone) return res.status(400).json({ success: false, message: 'Nomor telepon tidak valid' });
    const data = await orderModel.findByPhone(phone);
    res.json({ success: true, message: 'Daftar pesanan ditemukan', data });
  } catch (error) {
    next(error);
  }
});

// GET /api/orders/track/:orderNumber - Track order (public) — harus di atas
router.get('/track/:orderNumber', async (req, res, next) => {
  try {
    const data = await orderModel.findByOrderNumber(req.params.orderNumber);
    if (!data) return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan' });
    res.json({ success: true, message: 'Pesanan ditemukan', data });
  } catch (error) {
    next(error);
  }
});

// GET /api/orders - Get all orders with pagination (admin only)
router.get('/', authMiddleware.verifyToken, authMiddleware.isAdmin, async (req, res, next) => {
  try {
    const { data, pagination } = await orderModel.findWithPagination(req.query);
    res.json({ success: true, message: 'Daftar pesanan ditemukan', data, pagination });
  } catch (error) {
    next(error);
  }
});

// GET /api/orders/:id - Get order by ID (admin only)
router.get('/:id', authMiddleware.verifyToken, authMiddleware.isAdmin, async (req, res, next) => {
  try {
    const data = await orderModel.findById(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan' });
    res.json({ success: true, message: 'Pesanan ditemukan', data });
  } catch (error) {
    next(error);
  }
});

// PUT /api/orders/:id/status - Update order status (admin only)
router.put('/:id/status', authMiddleware.verifyToken, authMiddleware.isAdmin, async (req, res, next) => {
  try {
    const current = await orderModel.findById(req.params.id);
    if (!current) return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan' });

    const nextStatus = req.body.status;
    if (!allowedTransitions[current.orderStatus]?.includes(nextStatus)) {
      return res.status(400).json({ success: false, message: 'Perubahan status tidak valid' });
    }

    const data = nextStatus === 'cancelled'
      ? await prisma.$transaction(async (tx) => {
        const latest = await tx.order.findUnique({ where: { id: parseInt(req.params.id) }, include: { items: true } });
        if (!latest || latest.orderStatus === 'cancelled') return latest;
        const order = await tx.order.update({ where: { id: latest.id }, data: { orderStatus: nextStatus }, include: { items: true } });
        for (const item of order.items) {
          await tx.menu.update({ where: { id: item.menuId }, data: { stock: { increment: item.quantity } } });
        }
        return order;
      })
      : await orderModel.updateStatus(req.params.id, nextStatus);
    res.json({ success: true, message: 'Status pesanan diperbarui', data });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
