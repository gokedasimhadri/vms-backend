const express = require('express');
const router = express.Router();
const batteriesController = require('./batteries.controller');

router.get('/batteries', batteriesController.getBatteriesData);
router.get('/batteries/data', batteriesController.getBatteriesData);

module.exports = router;
