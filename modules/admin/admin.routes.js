const express = require('express');
const router = express.Router();
const adminController = require('./admin.controller');

// Dedicated Admin Routes
router.get('/admin/data', adminController.getAdminData);
router.post('/admin/stages', adminController.createStage);
router.post('/admin/:type', adminController.createAdminItem);
router.put('/admin/:type/:id', adminController.updateAdminItem);
router.delete('/admin/:type/:id', adminController.deleteAdminItem);
router.get('/admin/stage-form-options', adminController.getStageFormOptions);

// Backward-compatibility aliases for existing dashboard/admin calls
router.get('/dashboard/admin-data', adminController.getAdminData);
router.post('/dashboard/admin/stages', adminController.createStage);
router.delete('/dashboard/admin/:type/:id', adminController.deleteAdminItem);
router.get('/dashboard/admin/stage-form-options', adminController.getStageFormOptions);

module.exports = router;
