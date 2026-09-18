const express = require('express');
const router = express.Router();
const batteriesController = require('./batteries.controller');

router.get('/batteries', batteriesController.getBatteriesData);
router.post('/batteries/:type', batteriesController.createBatteryItem);
router.put('/batteries/:type/:id', batteriesController.updateBatteryItem);
router.delete('/batteries/:type/:id', batteriesController.deleteBatteryItem);

module.exports = router;
