/**
 * Model: OrderSequence
 * Blueprint dari tabel `order_sequences` di database
 *
 * Digunakan untuk generate nomor order unik per hari.
  * Format: DK-YYYYMMDD-NNNN
 *
 * Fields:
 * - id:             INT AUTO_INCREMENT PRIMARY KEY
 * - datePrefix:     VARCHAR(6) NOT NULL (contoh: '250705')
 * - sequenceNumber: INT DEFAULT 0
 *
 * Unique: (datePrefix) — satu sequence per hari
 */

const prisma = require('../utils/prisma');
const { getDatePrefix, formatOrderNumber } = require('../utils/orderNumber');

class OrderSequenceModel {
  /**
   * Generate order number berikutnya (atomic, untuk concurrency)
   * Format: DK-YYYYMMDD-NNNN (brand-tanggal-increment harian)
   * Dipanggil dalam transaction dengan lock.
   */
  async generateOrderNumber(tx) {
    const datePrefix = getDatePrefix();

    // Upsert: insert jika belum ada, increment jika sudah ada
    await tx.orderSequence.upsert({
      where: { datePrefix },
      update: { sequenceNumber: { increment: 1 } },
      create: { datePrefix, sequenceNumber: 1 },
    });

    // Read sequence number setelah increment
    const sequence = await tx.orderSequence.findUnique({
      where: { datePrefix },
    });

    return formatOrderNumber(datePrefix, sequence.sequenceNumber);
  }
}

module.exports = new OrderSequenceModel();
