const express = require('express');
const router = express.Router();
const postalCodeController = require('../controllers/postalCodeController');

router.get('/:code', postalCodeController.lookup);

module.exports = router;
