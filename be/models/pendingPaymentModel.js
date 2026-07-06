/**
 * Model: PendingPayment
 * Blueprint dari tabel `pending_payments` di database
 *
 * Pending payment dibuat SEBELUM pembayaran. Order belum ada.
 * Jika pembayaran sukses → create order + delete/move pending.
 * Jika pembayaran gagal/expired → update status saja.
 *
 * Fields:
 * - id:                    INT AUTO_INCREMENT PRIMARY KEY
 * - sessionToken:          VARCHAR(100) UNIQUE NOT NULL
 * - customerName:          VARCHAR(100) NOT NULL
 * - customerPhone:         VARCHAR(20) NOT NULL
 * - customerAddress:       TEXT NOT NULL
 * - customerLatitude:      DECIMAL(10,8) NULL
 * - customerLongitude:     DECIMAL(11,8) NULL
 * - notes:                 TEXT NULL
 * - items:                 JSON NOT NULL (array of cart items)
 * - subtotal:              DECIMAL(10,2) NOT NULL
 * - serviceFee:            DECIMAL(10,2) DEFAULT 0
 * - deliveryFee:           DECIMAL(10,2) DEFAULT 0
 * - total:                 DECIMAL(10,2) NOT NULL
 * - midtransTransactionId: VARCHAR(100) UNIQUE NULL
 * - paymentUrl:            TEXT NULL
 * - qrCodeUrl:             TEXT NULL
 * - status:                VARCHAR(20) DEFAULT 'pending'
 *   (pending -> paid | expired | failed)
 * - expiresAt:             TIMESTAMP NOT NULL (10 menit dari created)
 * - createdAt:             TIMESTAMP DEFAULT NOW()
 * - paidAt:                TIMESTAMP NULL
 *
 * Relasi:
 * - PendingPayment 1:0..1 Order
 */

const prisma = require('../utils/prisma');

class PendingPaymentModel {
  async create(data) {
    return prisma.pendingPayment.create({
      data: {
        sessionToken: data.sessionToken,
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
        items: data.items,
        subtotal: data.subtotal,
        serviceFee: data.serviceFee || 0,
        deliveryFee: data.deliveryFee || 0,
        total: data.total,
        midtransTransactionId: data.midtransTransactionId || null,
        paymentUrl: data.paymentUrl || null,
        qrCodeUrl: data.qrCodeUrl || null,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });
  }

  async findByToken(sessionToken) {
    return prisma.pendingPayment.findUnique({
      where: { sessionToken },
    });
  }

  async findByMidtransId(midtransTransactionId) {
    return prisma.pendingPayment.findUnique({
      where: { midtransTransactionId },
    });
  }

  async updateStatus(id, status) {
    return prisma.pendingPayment.update({
      where: { id },
      data: {
        status,
        ...(status === 'paid' && { paidAt: new Date() }),
      },
    });
  }

  async updateMidtransData(id, data) {
    return prisma.pendingPayment.update({
      where: { id },
      data: {
        midtransTransactionId: data.midtransTransactionId,
        paymentUrl: data.paymentUrl,
        qrCodeUrl: data.qrCodeUrl,
      },
    });
  }

  /**
   * Get pending payment dengan lock (untuk concurrency)
   */
  async findByIdForUpdate(tx, id) {
    return tx.pendingPayment.findUnique({
      where: { id },
    });
  }

  /**
   * Expire pending payments yang sudah lewat waktu
   */
  async expireOldPayments() {
    return prisma.pendingPayment.updateMany({
      where: {
        status: 'pending',
        expiresAt: { lt: new Date() },
      },
      data: { status: 'expired' },
    });
  }
}

module.exports = new PendingPaymentModel();
