const checklistModel = require('../models/checklistModel');
const orderModel = require('../models/orderModel');

class ChecklistController {
  // Create checklist for an order
  async createChecklist(req, res) {
    try {
      const { orderId } = req.params;
      const { items } = req.body;

      // Verify order exists
      const order = await orderModel.findById(orderId);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order tidak ditemukan'
        });
      }

      // Create checklist items
      await checklistModel.createChecklistForOrder(parseInt(orderId), items);

      res.json({
        success: true,
        message: 'Checklist berhasil dibuat'
      });
    } catch (error) {
      console.error('Create checklist error:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal membuat checklist'
      });
    }
  }

  // Get checklist for an order
  async getChecklistByOrderId(req, res) {
    try {
      const { orderId } = req.params;
      const checklist = await checklistModel.getChecklistByOrderId(parseInt(orderId));

      res.json({
        success: true,
        data: checklist
      });
    } catch (error) {
      console.error('Get checklist error:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal mengambil checklist'
      });
    }
  }

  // Update checklist item
  async updateChecklistItem(req, res) {
    try {
      const { id } = req.params;
      const { checked, checkedBy, notes } = req.body;

      const updated = await checklistModel.updateChecklistItem(
        parseInt(id),
        checked,
        checkedBy,
        notes
      );

      res.json({
        success: true,
        message: 'Checklist berhasil diupdate',
        data: updated
      });
    } catch (error) {
      console.error('Update checklist error:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal mengupdate checklist'
      });
    }
  }

  // Get all checklists
  async getAllChecklists(req, res) {
    try {
      const { checked, limit, offset } = req.query;
      const filters = {};

      if (checked !== undefined) {
        filters.checked = checked === 'true';
      }
      if (limit) filters.limit = parseInt(limit);
      if (offset) filters.offset = parseInt(offset);

      const checklists = await checklistModel.getAllChecklists(filters);

      res.json({
        success: true,
        data: checklists
      });
    } catch (error) {
      console.error('Get all checklists error:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal mengambil checklist'
      });
    }
  }
}

module.exports = new ChecklistController();