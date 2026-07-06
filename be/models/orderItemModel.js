/**
 * Model: OrderItem
 * Blueprint dari tabel `order_items` di database
 *
 * Fields:
 * - id:              INT AUTO_INCREMENT PRIMARY KEY
 * - orderId:         INT NOT NULL (FK -> orders.id, ON DELETE CASCADE)
 * - menuId:          INT NOT NULL (FK -> menus.id)
 * - menuName:        VARCHAR(200) NOT NULL (snapshot nama saat order)
 * - quantity:        INT NOT NULL
 * - price:           DECIMAL(10,2) NOT NULL (harga saat order)
 * - discountPercent: INT DEFAULT 0 (snapshot diskon saat order)
 * - subtotal:        DECIMAL(10,2) NOT NULL (price * qty setelah diskon)
 * - notes:           TEXT NULL (catatan per item)
 *
 * Relasi:
 * - OrderItem N:1 Order
 * - OrderItem N:1 Menu
 */

const prisma = require('../utils/prisma');

class OrderItemModel {
  async findByOrderId(orderId) {
    return prisma.orderItem.findMany({
      where: { orderId: parseInt(orderId) },
      include: { menu: true },
    });
  }

  async createMany(tx, items, orderId) {
    return tx.orderItem.createMany({
      data: items.map((item) => ({
        orderId,
        menuId: item.menuId,
        menuName: item.name,
        quantity: item.quantity,
        price: item.price,
        discountPercent: item.discountPercent || 0,
        subtotal: item.subtotal,
        notes: item.notes || null,
      })),
    });
  }
}

module.exports = new OrderItemModel();
