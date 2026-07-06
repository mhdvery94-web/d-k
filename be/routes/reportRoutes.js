const express = require('express');
const router = express.Router();
const orderModel = require('../models/orderModel');
const authMiddleware = require('../middleware/authMiddleware');
const PDFDocument = require('pdfkit');
const { Parser } = require('json2csv');

async function salesReport(req, res, next) {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ success: false, message: 'startDate dan endDate wajib diisi' });

    const orders = await orderModel.findAll({ startDate, endDate });
    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total), 0);
    const topItemsMap = new Map();

    orders.forEach((order) => {
      order.items.forEach((item) => {
        const prev = topItemsMap.get(item.menuName) || { menuName: item.menuName, quantity: 0, revenue: 0 };
        prev.quantity += item.quantity;
        prev.revenue += Number(item.subtotal);
        topItemsMap.set(item.menuName, prev);
      });
    });

    res.json({
      success: true,
      message: 'Laporan penjualan ditemukan',
      data: {
        totalOrders: orders.length,
        totalRevenue,
        averageOrderValue: orders.length ? Math.round(totalRevenue / orders.length) : 0,
        topItems: Array.from(topItemsMap.values()).sort((a, b) => b.quantity - a.quantity),
        orders,
      },
    });
  } catch (error) {
    next(error);
  }
}

router.get('/sales', authMiddleware.verifyToken, authMiddleware.isAdmin, salesReport);

// GET /api/reports/daily - Get daily report (admin only)
router.get('/daily', authMiddleware.verifyToken, authMiddleware.isAdmin, salesReport);

// GET /api/reports/weekly - Get weekly report (admin only)
router.get('/weekly', authMiddleware.verifyToken, authMiddleware.isAdmin, salesReport);

// GET /api/reports/monthly - Get monthly report (admin only)
router.get('/monthly', authMiddleware.verifyToken, authMiddleware.isAdmin, salesReport);

// Export report as PDF
router.get('/export/pdf', authMiddleware.verifyToken, authMiddleware.isAdmin, async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ success: false, message: 'startDate dan endDate wajib diisi' });

    const orders = await orderModel.findAll({ startDate, endDate });
    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total), 0);
    const topItemsMap = new Map();

    orders.forEach((order) => {
      order.items.forEach((item) => {
        const prev = topItemsMap.get(item.menuName) || { menuName: item.menuName, quantity: 0, revenue: 0 };
        prev.quantity += item.quantity;
        prev.revenue += Number(item.subtotal);
        topItemsMap.set(item.menuName, prev);
      });
    });

    const topItems = Array.from(topItemsMap.values()).sort((a, b) => b.quantity - a.quantity).slice(0, 10);

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="laporan-${startDate}-sampai-${endDate}.pdf"`);
    doc.pipe(res);

    doc.fontSize(20).text('Laporan Penjualan', 50, 50);
    doc.fontSize(12).text(`Periode: ${startDate} s/d ${endDate}`, 50, 80);
    doc.moveDown();

    doc.fontSize(14).text('Ringkasan', 50, 120);
    doc.fontSize(10).text(`Total Pesanan: ${orders.length}`, 50, 145);
    doc.text(`Total Pendapatan: Rp ${totalRevenue.toLocaleString('id-ID')}`, 50, 165);
    doc.text(`Rata-rata per Pesanan: Rp ${orders.length ? Math.round(totalRevenue / orders.length).toLocaleString('id-ID') : 0}`, 50, 185);
    doc.moveDown(2);

    doc.fontSize(14).text('Top 10 Menu Terlaris', 50, 220);
    let yPos = 245;
    topItems.forEach((item, index) => {
      doc.fontSize(10).text(`${index + 1}. ${item.menuName}`, 50, yPos);
      doc.text(`   ${item.quantity} terjual - Rp ${item.revenue.toLocaleString('id-ID')}`, 50, yPos + 15);
      yPos += 35;
    });

    doc.end();
  } catch (error) {
    next(error);
  }
});

// Export report as CSV
router.get('/export/csv', authMiddleware.verifyToken, authMiddleware.isAdmin, async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ success: false, message: 'startDate dan endDate wajib diisi' });

    const orders = await orderModel.findAll({ startDate, endDate });

    const csvData = orders.map(order => ({
      'No. Pesanan': order.orderNumber,
      'Tanggal': new Date(order.createdAt).toLocaleDateString('id-ID'),
      'Nama Pelanggan': order.customerName,
      'Telepon': order.customerPhone,
      'Total': Number(order.total),
      'Status': order.orderStatus,
      'Jumlah Item': order.items.length
    }));

    const parser = new Parser();
    const csv = parser.parse(csvData);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="laporan-${startDate}-sampai-${endDate}.csv"`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
