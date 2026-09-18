const express = require('express');
const router = express.Router();
const busBreakdownController = require('./bus-breakdown.controller');

router.get('/bus-breakdown', busBreakdownController.getBusBreakdownData);
router.post('/bus-breakdown', busBreakdownController.createBusBreakdownItem);
router.put('/bus-breakdown/:id', busBreakdownController.updateBusBreakdownItem);
router.delete('/bus-breakdown/:id', busBreakdownController.deleteBusBreakdownItem);

module.exports = router;
