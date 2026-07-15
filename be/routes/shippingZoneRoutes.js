const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const shippingZoneService = require('../services/shippingZoneService');

router.get('/', authMiddleware.verifyToken, authMiddleware.isAdmin, async (req, res, next) => {
  try {
    const zones = await shippingZoneService.getAllZones();
    res.json({ success: true, data: zones });
  } catch (error) {
    next(error);
  }
});

router.post('/', authMiddleware.verifyToken, authMiddleware.isAdmin, async (req, res, next) => {
  try {
    const { kodeZona, jarakMin, jarakMax, tarif } = req.body;
    if (!kodeZona || jarakMin === undefined || tarif === undefined) {
      return res.status(400).json({ success: false, message: 'kodeZona, jarakMin, dan tarif wajib diisi' });
    }
    const zone = await shippingZoneService.createZone({ kodeZona, jarakMin, jarakMax, tarif });
    res.status(201).json({ success: true, data: zone });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'Kode zona sudah ada' });
    }
    next(error);
  }
});

router.put('/:id', authMiddleware.verifyToken, authMiddleware.isAdmin, async (req, res, next) => {
  try {
    const { kodeZona, jarakMin, jarakMax, tarif, isActive } = req.body;
    const zone = await shippingZoneService.updateZone(req.params.id, { kodeZona, jarakMin, jarakMax, tarif, isActive });
    res.json({ success: true, data: zone });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Zona tidak ditemukan' });
    }
    next(error);
  }
});

router.patch('/:id/toggle', authMiddleware.verifyToken, authMiddleware.isAdmin, async (req, res, next) => {
  try {
    const zone = await shippingZoneService.toggleZone(req.params.id);
    if (!zone) return res.status(404).json({ success: false, message: 'Zona tidak ditemukan' });
    res.json({ success: true, data: zone });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authMiddleware.verifyToken, authMiddleware.isAdmin, async (req, res, next) => {
  try {
    await shippingZoneService.deleteZone(req.params.id);
    res.json({ success: true, message: 'Zona dihapus' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Zona tidak ditemukan' });
    }
    next(error);
  }
});

module.exports = router;
