import mongoose from "mongoose";

const availabilitySchema = new mongoose.Schema({
  start: { type: Date, required: true },
  end: { type: Date, required: true },
  type: { type: String, enum: ["available", "blocked"], default: "blocked" },
  note: { type: String },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null },
  apartmentId: { type: String }
}, { timestamps: true });

const Availability = mongoose.model("Availability", availabilitySchema);
export default Availability;
