const express = require('express');
const router = express.Router();
const ucpController = require('../controllers/ucpController');

// UCP Standard: Discovery endpoint for AI agents
router.get('/discover', ucpController.discoverInventory);

// UCP Standard: Agentic checkout initiation
router.post('/checkout', ucpController.initiateAgenticCheckout);

module.exports = router;