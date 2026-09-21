const express = require('express');
const router = express.Router();
const dashboardController = require('./dashboard.controller');

// Modern aggregated dashboard overview
router.get('/dashboard/overview', dashboardController.getOverview);

// All 10 legacy dashboard endpoints from reference.js
router.get('/RtaExpired', dashboardController.getRtaExpired);
router.get('/PollutionExpired', dashboardController.getPollutionExpired);
router.get('/FitnessExpired', dashboardController.getFitnessExpired);
router.get('/RoadtaxExpired', dashboardController.getRoadtaxExpired);
router.get('/RoadpermitExpired', dashboardController.getRoadpermitExpired);
router.get('/InsuranceExpired', dashboardController.getInsuranceExpired);
router.get('/getBusfilldata', dashboardController.getBusfilldata);
router.get('/vehicletripexceed', dashboardController.getVehicletripexceed);
router.get('/getVehicleservice', dashboardController.getVehicleservice);
router.get('/getBusbreakedowndata', dashboardController.getBusbreakedowndata);

module.exports = router;


