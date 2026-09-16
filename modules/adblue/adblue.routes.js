const express = require('express');
const router = express.Router();
const adblueController = require('./adblue.controller');

router.get('/adblue', adblueController.getAdBlueData);
router.get('/adblue/data', adblueController.getAdBlueData);
router.get('/ad-blue', adblueController.getAdBlueData);

module.exports = router;
