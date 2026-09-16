const express = require('express');
const router = express.Router();
const vehicleTyresController = require('./vehicle-tyres.controller');

router.get('/vehicle-tyres', vehicleTyresController.getVehicleTyresData);
router.get('/vehicle-tyres/data', vehicleTyresController.getVehicleTyresData);
router.get('/vehicletyres', vehicleTyresController.getVehicleTyresData);

module.exports = router;
