const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const midtransClient = require('midtrans-client');
const prisma = require('../utils/prisma');
const menuModel = require('../models/menuModel');
const pendingPaymentModel = require('../models/pendingPaymentModel');
const orderItemModel = require('../models/orderItemModel');
const orderSequenceModel = require('../models/orderSequenceModel');
const { validateOrderData, normalizePhone } = require('../utils/validators');
const { broadcastNotification } = require('./notificationRoutes');

const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  serverKey: process.env.MIDTRANS_SERVER_KEY || '',
  clientKey: process.env.MIDTRANS_CLIENT_KEY || '',
});
const core = new midtransClient.CoreApi({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  serverKey: process.env.MIDTRANS_SERVER_KEY || '',
  clientKey: process.env.MIDTRANS_CLIENT_KEY || '',
});

async function createOrderFromPending(pending) {
  if (pending.status === 'paid') return prisma.order.findUnique({ where: { pendingPaymentId: pending.id }, include: { items: true } });

  return prisma.$transaction(async (tx) => {
    const locked = await tx.pendingPayment.findUnique({ where: { id: pending.id } });
    if (!locked || locked.status === 'paid') return null;

    const orderNumber = await orderSequenceModel.generateOrderNumber(tx);
    const order = await tx.order.create({
      data: {
        orderNumber,
        pendingPaymentId: locked.id,
        customerName: locked.customerName,
        customerPhone: locked.customerPhone,
        customerAddress: locked.customerAddress,
        customerPostalCode: locked.customerPostalCode,
        customerKelurahan: locked.customerKelurahan,
        customerKecamatan: locked.customerKecamatan,
        customerKota: locked.customerKota,
        customerProvinsi: locked.customerProvinsi,
        customerLatitude: locked.customerLatitude,
        customerLongitude: locked.customerLongitude,
        notes: locked.notes,
        subtotal: locked.subtotal,
        serviceFee: locked.serviceFee,
        deliveryFee: locked.deliveryFee,
        total: locked.total,
        paymentStatus: 'paid',
        midtransTransactionId: locked.midtransTransactionId || locked.sessionToken,
        paidAt: new Date(),
      },
    });

    await orderItemModel.createMany(tx, locked.items, order.id);
    for (const item of locked.items) {
      await menuModel.decrementStock(tx, item.menuId, item.quantity);
    }
    await tx.pendingPayment.update({ where: { id: locked.id }, data: { status: 'paid', paidAt: new Date() } });
    return tx.order.findUnique({ where: { id: order.id }, include: { items: true } });
  });
}

function isValidMidtransSignature(body) {
  if (!process.env.MIDTRANS_SERVER_KEY) return true;
  if (!body.signature_key) return false;

  const raw = `${body.order_id}${body.status_code}${body.gross_amount}${process.env.MIDTRANS_SERVER_KEY}`;
  const signature = crypto.createHash('sha512').update(raw).digest('hex');
  return signature === body.signature_key;
}

// POST /api/payments/create - Create payment (public)
router.post('/create', async (req, res, next) => {
  try {
    const errors = validateOrderData(req.body);
    if (errors.length) return res.status(400).json({ success: false, message: errors.join(', ') });

    const customerPhone = normalizePhone(req.body.customerPhone);
    if (!customerPhone) return res.status(400).json({ success: false, message: 'Nomor telepon tidak valid' });

    const menuIds = req.body.items.map((item) => Number(item.menuId || item.id));
    const menus = await prisma.menu.findMany({ where: { id: { in: menuIds }, isActive: true } });
    const menuById = new Map(menus.map((menu) => [menu.id, menu]));
    const items = req.body.items.map((item) => {
      const menuId = Number(item.menuId || item.id);
      const menu = menuById.get(menuId);
      const quantity = Number(item.quantity || item.qty || 1);
      if (!menu) throw new Error('Menu tidak ditemukan');
      if (menu.stock < quantity) throw new Error(`Stock ${menu.name} tidak cukup`);
      const price = Number(menu.price);
      const discountPercent = Number(menu.discountPercent || 0);
      const finalPrice = Math.round(price * (1 - discountPercent / 100));
      return { menuId, name: menu.name, quantity, price: finalPrice, discountPercent, subtotal: finalPrice * quantity, notes: item.notes || null };
    });
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const serviceFee = Math.round(subtotal * 0.1);
    const total = subtotal + serviceFee;
    const sessionToken = crypto.randomUUID();

    const pending = await pendingPaymentModel.create({
      sessionToken,
      customerName: req.body.customerName,
      customerPhone,
      customerAddress: req.body.customerAddress,
      customerPostalCode: req.body.customerPostalCode,
      customerKelurahan: req.body.customerKelurahan,
      customerKecamatan: req.body.customerKecamatan,
      customerKota: req.body.customerKota,
      customerProvinsi: req.body.customerProvinsi,
      customerLatitude: req.body.customerLatitude,
      customerLongitude: req.body.customerLongitude,
      notes: req.body.notes,
      items,
      subtotal,
      serviceFee,
      total,
    });

    let snapToken = null;
    if (process.env.MIDTRANS_SERVER_KEY && process.env.MIDTRANS_CLIENT_KEY) {
      const transaction = await snap.createTransaction({
        transaction_details: { order_id: sessionToken, gross_amount: total },
        customer_details: { first_name: req.body.customerName, phone: customerPhone },
        enabled_payments: ['other_qris'],
      });
      snapToken = transaction.token;
      await pendingPaymentModel.updateMidtransData(pending.id, { midtransTransactionId: sessionToken, paymentUrl: transaction.redirect_url });
    }

    res.status(201).json({ success: true, message: 'Pembayaran dibuat', data: { sessionToken, snapToken, total } });
  } catch (error) {
    next(error);
  }
});

// POST /api/payments/webhook - Midtrans webhook (public)
router.post('/webhook', async (req, res, next) => {
  try {
    if (!isValidMidtransSignature(req.body)) {
      return res.status(403).json({ success: false, message: 'Invalid Midtrans signature' });
    }

    const orderId = req.body.order_id;
    const status = req.body.transaction_status;
    const pending = await pendingPaymentModel.findByToken(orderId);
    if (!pending) return res.json({ success: true, message: 'Webhook ignored' });

    if (status === 'settlement' || status === 'capture') {
      const order = await createOrderFromPending(pending);
      if (order) {
        broadcastNotification({
          type: 'new_order',
          data: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            total: order.total,
            timestamp: new Date().toISOString()
          }
        });
      }
    }
    if (['expire', 'cancel', 'deny', 'failure'].includes(status)) await pendingPaymentModel.updateStatus(pending.id, status === 'expire' ? 'expired' : 'failed');
    res.json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    next(error);
  }
});

// GET /api/payments/status/:token - Check payment status (public)
router.get('/status/:token', async (req, res, next) => {
  try {
    const pending = await pendingPaymentModel.findByToken(req.params.token);
    if (!pending) return res.status(404).json({ success: false, message: 'Pembayaran tidak ditemukan' });
    let latestPending = pending;

    if (pending.status === 'pending' && process.env.MIDTRANS_SERVER_KEY) {
      try {
        const status = await core.transaction.status(req.params.token);
        if (['settlement', 'capture'].includes(status.transaction_status)) {
          await createOrderFromPending(pending);
          latestPending = await pendingPaymentModel.findByToken(req.params.token);
        }
        if (['expire', 'cancel', 'deny', 'failure'].includes(status.transaction_status)) {
          await pendingPaymentModel.updateStatus(pending.id, status.transaction_status === 'expire' ? 'expired' : 'failed');
          latestPending = await pendingPaymentModel.findByToken(req.params.token);
        }
      } catch {}
    }

    const order = await prisma.order.findUnique({ where: { pendingPaymentId: pending.id }, include: { items: true } });
    res.json({ success: true, message: 'Status pembayaran ditemukan', data: { status: latestPending.status, order } });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
