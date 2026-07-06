/**
 * Model: Order
 * Blueprint dari tabel `orders` di database
 *
 * Order hanya dibuat SETELAH pembayaran sukses (payment-first flow).
 *
 * Fields:
 * - id:                    INT AUTO_INCREMENT PRIMARY KEY
 * - orderNumber:           VARCHAR(20) UNIQUE NOT NULL (format: YYMMDD + huruf)
 * - pendingPaymentId:      INT UNIQUE NOT NULL (FK -> pending_payments.id)
 * - customerName:          VARCHAR(100) NOT NULL
 * - customerPhone:         VARCHAR(20) NOT NULL
 * - customerAddress:       TEXT NOT NULL
 * - customerLatitude:      DECIMAL(10,8) NULL
 * - customerLongitude:     DECIMAL(11,8) NULL
 * - notes:                 TEXT NULL (catatan umum)
 * - subtotal:              DECIMAL(10,2) NOT NULL
 * - serviceFee:            DECIMAL(10,2) DEFAULT 0
 * - deliveryFee:           DECIMAL(10,2) DEFAULT 0
 * - total:                 DECIMAL(10,2) NOT NULL
 * - paymentStatus:         VARCHAR(20) DEFAULT 'paid' (selalu paid karena payment-first)
 * - orderStatus:           VARCHAR(20) DEFAULT 'confirmed'
 *   (confirmed -> preparing -> delivering -> completed | cancelled)
 * - midtransTransactionId: VARCHAR(100) NOT NULL
 * - paidAt:                TIMESTAMP NOT NULL
 * - createdAt:             TIMESTAMP DEFAULT NOW()
 * - updatedAt:             TIMESTAMP ON UPDATE NOW()
 *
 * Relasi:
 * - Order 1:1 PendingPayment
 * - Order 1:N OrderItem
 */

const prisma = require('../utils/prisma');

class OrderModel {
  async findAll(filters = {}) {
    const where = {};

    if (filters.status) {
      where.orderStatus = filters.status;
    }

    if (filters.startDate && filters.endDate) {
      where.createdAt = {
        gte: new Date(filters.startDate),
        lte: new Date(`${filters.endDate}T23:59:59.999Z`),
      };
    }

    if (filters.search) {
      where.OR = [
        { orderNumber: { contains: filters.search } },
        { customerName: { contains: filters.search } },
        { customerPhone: { contains: filters.search } },
      ];
    }

    return prisma.order.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id) {
    return prisma.order.findUnique({
      where: { id: parseInt(id) },
      include: { items: true },
    });
  }

  async findByOrderNumber(orderNumber) {
    return prisma.order.findUnique({
      where: { orderNumber },
      include: { items: true },
    });
  }

  async findByPhone(phone) {
    return prisma.order.findMany({
      where: { customerPhone: phone },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(tx, data) {
    return tx.order.create({
      data: {
        orderNumber: data.orderNumber,
        pendingPaymentId: data.pendingPaymentId,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerAddress: data.customerAddress,
        customerPostalCode: data.customerPostalCode || null,
        customerKelurahan: data.customerKelurahan || null,
        customerKecamatan: data.customerKecamatan || null,
        customerKota: data.customerKota || null,
        customerProvinsi: data.customerProvinsi || null,
        customerLatitude: data.customerLatitude || null,
        customerLongitude: data.customerLongitude || null,
        notes: data.notes || null,
        subtotal: data.subtotal,
        serviceFee: data.serviceFee || 0,
        deliveryFee: data.deliveryFee || 0,
        total: data.total,
        midtransTransactionId: data.midtransTransactionId,
        paidAt: new Date(),
      },
    });
  }

  async updateStatus(id, status) {
    return prisma.order.update({
      where: { id: parseInt(id) },
      data: { orderStatus: status },
    });
  }

  async findWithPagination(filters = {}) {
    const {
      page = 1,
      limit = 10,
      status,
      search,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = filters;

    const where = {};

    if (status) {
      where.orderStatus = status;
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search } },
        { customerName: { contains: search } },
        { customerPhone: { contains: search } }
      ];
    }

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate + 'T23:59:59.999Z')
      };
    }

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: true,
        },
        orderBy: {
          [sortBy]: sortOrder
        },
        skip,
        take: limit
      }),
      prisma.order.count({ where })
    ]);

    return {
      data: orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}

module.exports = new OrderModel();
