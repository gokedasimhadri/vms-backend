const express = require('express');
const router = express.Router();
const fuelsController = require('./fuels.controller');

router.get('/fuels', fuelsController.getFuelsData);
router.post('/fuels/:type', fuelsController.createFuelItem);
router.put('/fuels/:type/:id', fuelsController.updateFuelItem);
router.delete('/fuels/:type/:id', fuelsController.deleteFuelItem);

module.exports = router;
