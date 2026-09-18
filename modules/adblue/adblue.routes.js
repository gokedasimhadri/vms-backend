const express = require('express');
const router = express.Router();
const adBlueController = require('./adblue.controller');

router.get('/adblue', adBlueController.getAdBlueData);
router.post('/adblue/:type', adBlueController.createAdBlueItem);
router.put('/adblue/:type/:id', adBlueController.updateAdBlueItem);
router.delete('/adblue/:type/:id', adBlueController.deleteAdBlueItem);

module.exports = router;
