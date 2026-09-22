const express = require('express');
const router = express.Router();
const vehiclesController = require('./vehicles.controller');

router.get('/vehicles', vehiclesController.getVehiclesData);
router.get('/getVehicleTripdata', vehiclesController.getVehicleTripdata);
router.post('/vehicles/bulk/:type', vehiclesController.bulkCreateVehicleItems);
router.post('/vehicles/:type', vehiclesController.createVehicleItem);
router.put('/vehicles/:type/:id', vehiclesController.updateVehicleItem);
router.delete('/vehicles/:type/:id', vehiclesController.deleteVehicleItem);

module.exports = router;
