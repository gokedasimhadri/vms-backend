const express = require('express');
const router = express.Router();
const certificatesController = require('./certificates.controller');

router.get('/certificates', certificatesController.getCertificatesData);
router.post('/certificates/:type', certificatesController.createCertificateItem);
router.put('/certificates/:type/:id', certificatesController.updateCertificateItem);
router.delete('/certificates/:type/:id', certificatesController.deleteCertificateItem);

module.exports = router;
