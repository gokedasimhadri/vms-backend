const express = require('express');
const router = express.Router();
const certificatesController = require('./certificates.controller');

router.get('/certificates', certificatesController.getCertificatesData);
router.get('/certificates/data', certificatesController.getCertificatesData);

module.exports = router;
