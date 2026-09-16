const express = require('express');
const router = express.Router();
const fuelsController = require('./fuels.controller');

router.get('/fuels', fuelsController.getFuelsData);
router.get('/fuels/data', fuelsController.getFuelsData);

module.exports = router;
