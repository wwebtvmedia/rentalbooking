import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
  fullName: { type: String, required: true }, // Encrypted
  email: { type: String, required: true },    // Encrypted
  emailHash: { type: String, index: true },   // Blind Index for searching
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  apartmentId: { type: String },
  start: { type: Date, required: true },
  end: { type: Date, required: true },
  status: { type: String, enum: ["confirmed", "cancelled"], default: "confirmed" },
  // Stripe payment fields
  paymentIntentId: { type: String },
  paymentStatus: { type: String, enum: ["none","requires_payment_method","requires_capture","succeeded","canceled"], default: 'none' },
  // Deposit amount in cents (if any)
  depositAmount: { type: Number, default: 0 },
  depositHeld: { type: Boolean, default: false },
  depositCaptured: { type: Boolean, default: false },
  depositCapturedAt: { type: Date },
  depositRefundedAt: { type: Date },
  // Crypto Payment Support
  paymentCurrency: { type: String, default: 'USD' }, // 'USD' for Stripe, 'USDC' for crypto
  cryptoTxHash: { type: String }
}, { timestamps: true });

const Booking = mongoose.model("Booking", bookingSchema);
export default Booking;
