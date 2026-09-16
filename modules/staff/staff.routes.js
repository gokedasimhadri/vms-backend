const express = require('express');
const router = express.Router();
const staffController = require('./staff.controller');

router.get('/staff', staffController.getStaffData);
router.get('/staff/data', staffController.getStaffData);

module.exports = router;
