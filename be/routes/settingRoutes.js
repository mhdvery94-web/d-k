const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const appSettings = require('../services/appSettingsService');

// Public - FE pembeli butuh packingFee, waAdmin, storeAddress (no auth)
router.get('/public', async (req, res, next) => {
  try {
    const data = await appSettings.getAll();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// Admin only
router.get('/', authMiddleware.verifyToken, authMiddleware.isAdmin, async (req, res, next) => {
  try {
    const data = await appSettings.getAll();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.put('/', authMiddleware.verifyToken, authMiddleware.isAdmin, async (req, res, next) => {
  try {
    const { packingFee, waAdmin, storeAddress } = req.body;
    if (packingFee !== undefined) await appSettings.set('packing_fee', String(packingFee));
    if (waAdmin !== undefined) await appSettings.set('wa_admin', waAdmin);
    if (storeAddress !== undefined) await appSettings.set('store_address', storeAddress);
    appSettings.invalidateCache();
    const data = await appSettings.getAll();
    res.json({ success: true, message: 'Pengaturan diperbarui', data });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
