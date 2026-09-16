const express = require('express');
const router = express.Router();
const busBreakdownController = require('./bus-breakdown.controller');

router.get('/bus-breakdown', busBreakdownController.getBusBreakdownData);
router.get('/bus-breakdown/data', busBreakdownController.getBusBreakdownData);

module.exports = router;
