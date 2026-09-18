const express = require('express');
const router = express.Router();
const vehicleTyresController = require('./vehicle-tyres.controller');

router.get('/vehicle-tyres', vehicleTyresController.getVehicleTyresData);
router.post('/vehicle-tyres/:type', vehicleTyresController.createVehicleTyreItem);
router.put('/vehicle-tyres/:type/:id', vehicleTyresController.updateVehicleTyreItem);
router.delete('/vehicle-tyres/:type/:id', vehicleTyresController.deleteVehicleTyreItem);

module.exports = router;
