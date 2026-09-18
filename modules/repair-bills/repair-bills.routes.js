const express = require('express');
const router = express.Router();
const repairBillsController = require('./repair-bills.controller');

router.get('/repair-bills', repairBillsController.getRepairBillsData);
router.get('/repair-bills/voucher-number', repairBillsController.generateVoucherNumber);
router.post('/repair-bills', repairBillsController.createRepairBill);
router.put('/repair-bills/:id', repairBillsController.updateRepairBill);
router.delete('/repair-bills/:id', repairBillsController.deleteRepairBill);

// Legacy route aliases for compatibility
router.get('/getRepairBillsdata', repairBillsController.getRepairBillsData);
router.post('/getRepairBillsdata1', repairBillsController.getRepairBillsData);
router.get('/generateVoucherNumber', repairBillsController.generateVoucherNumber);
router.post('/RepairBillsData', repairBillsController.createRepairBill);
router.post('/EditRepairBill', (req, res) => {
  req.params.id = req.body._id;
  return repairBillsController.updateRepairBill(req, res);
});
router.post('/RemoveRepairBill', (req, res) => {
  req.params.id = req.body._id;
  return repairBillsController.deleteRepairBill(req, res);
});

module.exports = router;
