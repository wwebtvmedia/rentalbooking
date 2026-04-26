import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  roles: { 
    type: [String], 
    enum: ['guest', 'host', 'concierge', 'contractor', 'admin'],
    default: ['guest']
  },
  // Role-specific metadata
  metadata: {
    taxId: { type: String },
    bankDetails: { type: String },
    specialties: [String], // For contractors
    tipsEarned: { type: Number, default: 0 }, // For concierge
  }
}, { timestamps: true });

const User = mongoose.model("User", userSchema);

export default User;
