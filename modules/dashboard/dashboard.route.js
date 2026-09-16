const express = require('express');
const router = express.Router();
const dashboardController = require('./dashboard.controller');

router.get('/dashboard/overview', dashboardController.getOverview);

module.exports = router;


