const express = require('express');
const router = express.Router();
const repairBillsController = require('./repair-bills.controller');

router.get('/repair-bills', repairBillsController.getRepairBillsData);
router.get('/repair-bills/data', repairBillsController.getRepairBillsData);

module.exports = router;
