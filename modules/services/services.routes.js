const express = require('express');
const router = express.Router();
const servicesController = require('./services.controller');

router.get('/services', servicesController.getServicesData);
router.get('/services/data', servicesController.getServicesData);

module.exports = router;
