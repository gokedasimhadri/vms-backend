const express = require('express');
const router = express.Router();
const vehiclesController = require('./vehicles.controller');

router.get('/vehicles', vehiclesController.getVehiclesData);
router.get('/vehicles/data', vehiclesController.getVehiclesData);

module.exports = router;
