import mongoose from 'mongoose';

const ApartmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  smallDescription: { type: String, default: '' },
  address: { type: String, default: '' },
  photos: { type: [String], default: [] },
  pricePerNight: { type: Number, default: 0 },
  rules: { type: String, default: '' },
  lat: { type: Number },
  lon: { type: Number },
  // Fixed deposit amount in cents (optional). If set, this is charged as the guarantee deposit when booking.
  depositAmount: { type: Number } 
}, { timestamps: true });

export default mongoose.model('Apartment', ApartmentSchema);