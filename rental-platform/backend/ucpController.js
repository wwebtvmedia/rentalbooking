const UniversalCommerce = require('../models/UniversalCommerce');

// GET /api/ucp/discover - Allows AI agents to find inventory via Capability Hashes
exports.discoverInventory = async (req, res) => {
  try {
    const { capabilityHash } = req.query;
    const items = await UniversalCommerce.find({ 
      "ucpMetadata.capabilityHash": capabilityHash,
      "checkoutSession.status": "OPEN" 
    }).populate('itemId');

    res.status(200).json({
      protocol: "UCP/1.0",
      results: items
    });
  } catch (error) {
    res.status(500).json({ error: "Discovery failed", details: error.message });
  }
};

// POST /api/ucp/checkout - Standardized UCP checkout for AI Agents
exports.initiateAgenticCheckout = async (req, res) => {
  try {
    const { ucpId, paymentMandateId } = req.body;

    const commerceRecord = await UniversalCommerce.findById(ucpId);
    if (!commerceRecord || commerceRecord.checkoutSession.status !== 'OPEN') {
      return res.status(400).json({ error: "Item unavailable for agentic checkout" });
    }

    // Lock the session for negotiation
    commerceRecord.checkoutSession.status = 'LOCKED';
    commerceRecord.checkoutSession.paymentMandateId = paymentMandateId;
    await commerceRecord.save();

    res.status(201).json({
      status: "SUCCESS",
      message: "Checkout locked for agent session",
      validUntil: new Date(Date.now() + 15 * 60000) // 15-minute lock
    });
  } catch (error) {
    res.status(500).json({ error: "Checkout initiation failed" });
  }
};