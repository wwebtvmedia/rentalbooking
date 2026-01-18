const mongoose = require('mongoose');

const UniversalCommerceSchema = new mongoose.Schema({
  // Reference to the original rental item (Car, Furniture, Apartment, etc.)
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RentalItem',
    required: true
  },
  // UCP Protocol Fields
  ucpMetadata: {
    capabilityHash: { type: String, required: true }, // For intent matching
    merchantOfRecord: { type: String, default: "YourPlatformName" },
    isAgenticEnabled: { type: Boolean, default: true }
  },
  // Real-time Pricing for AI Negotiation
  dynamicPricing: {
    baseRate: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    loyaltyDiscountEligible: { type: Boolean, default: true },
    priceValidUntil: { type: Date }
  },
  // Checkout & Payment (AP2/UCP Standard)
  checkoutSession: {
    sessionId: { type: String },
    paymentMandateId: { type: String }, // For Agent Payments Protocol (AP2)
    status: { 
      type: String, 
      enum: ['OPEN', 'NEGOTIATING', 'LOCKED', 'COMPLETED', 'EXPIRED'],
      default: 'OPEN'
    }
  },
  // Machine-readable availability for AI agents
  availabilityCalendar: [{
    startDate: Date,
    endDate: Date,
    isBooked: Boolean
  }]
}, { timestamps: true });

// Indexing for fast AI discovery
UniversalCommerceSchema.index({ "ucpMetadata.capabilityHash": 1 });

module.exports = mongoose.model('UniversalCommerce', UniversalCommerceSchema);