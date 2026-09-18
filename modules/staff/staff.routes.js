const express = require('express');
const router = express.Router();
const staffController = require('./staff.controller');

router.get('/staff', staffController.getStaffData);
router.post('/staff/:type', staffController.createStaffItem);
router.put('/staff/:type/:id', staffController.updateStaffItem);
router.delete('/staff/:type/:id', staffController.deleteStaffItem);

module.exports = router;
