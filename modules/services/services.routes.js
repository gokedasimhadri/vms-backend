const express = require('express');
const router = express.Router();
const servicesController = require('./services.controller');

router.get('/services', servicesController.getServicesData);
router.post('/services/:type', servicesController.createServiceItem);
router.put('/services/:type/:id', servicesController.updateServiceItem);
router.delete('/services/:type/:id', servicesController.deleteServiceItem);

module.exports = router;
