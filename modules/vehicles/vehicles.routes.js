const express = require('express');
const router = express.Router();
const vehiclesController = require('./vehicles.controller');

router.get('/vehicles', vehiclesController.getVehiclesData);
router.post('/vehicles/:type', vehiclesController.createVehicleItem);
router.put('/vehicles/:type/:id', vehiclesController.updateVehicleItem);
router.delete('/vehicles/:type/:id', vehiclesController.deleteVehicleItem);

module.exports = router;
