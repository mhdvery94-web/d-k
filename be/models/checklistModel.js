const prisma = require('../utils/prisma');

class ChecklistModel {
  // Create checklist items for an order
  async createChecklistForOrder(orderId, items) {
    const checklistItems = items.map(item => ({
      orderId,
      menuId: item.menuId,
      menuName: item.menuName,
      quantity: item.quantity,
      checked: false
    }));

    return await prisma.checklistItem.createMany({
      data: checklistItems
    });
  }

  // Get checklist for an order
  async getChecklistByOrderId(orderId) {
    return await prisma.checklistItem.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' }
    });
  }

  // Update checklist item (mark as checked)
  async updateChecklistItem(id, checked, checkedBy, notes = null) {
    return await prisma.checklistItem.update({
      where: { id },
      data: {
        checked,
        checkedAt: checked ? new Date() : null,
        checkedBy,
        notes
      }
    });
  }

  // Get all checklist items
  async getAllChecklists(filters = {}) {
    const where = {};
    
    if (filters.checked !== undefined) {
      where.checked = filters.checked;
    }

    return await prisma.checklistItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters.limit || 50,
      skip: filters.offset || 0
    });
  }
}

module.exports = new ChecklistModel();