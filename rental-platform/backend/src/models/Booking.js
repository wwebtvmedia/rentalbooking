import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  apartmentId: { type: String },
  start: { type: Date, required: true },
  end: { type: Date, required: true },
  status: { type: String, enum: ["confirmed", "cancelled"], default: "confirmed" }
}, { timestamps: true });

const Booking = mongoose.model("Booking", bookingSchema);
export default Booking;
