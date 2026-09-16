const express = require('express');
const router = express.Router();
const adminController = require('./admin.controller');

// Dedicated Admin Routes
router.get('/admin/data', adminController.getAdminData);
router.post('/admin/stages', adminController.createStage);
router.delete('/admin/:type/:id', adminController.deleteAdminItem);

// Backward-compatibility aliases for existing calls
router.get('/dashboard/admin-data', adminController.getAdminData);
router.post('/dashboard/admin/stages', adminController.createStage);
router.delete('/dashboard/admin/:type/:id', adminController.deleteAdminItem);

module.exports = router;
