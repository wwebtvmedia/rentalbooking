import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  role: { 
    type: String, 
    enum: ['guest', 'host', 'concierge', 'contractor', 'admin'],
    default: 'guest'
  },
  // Role-specific metadata
  metadata: {
    taxId: { type: String },
    bankDetails: { type: String },
    specialties: [String], 
    tipsEarned: { type: Number, default: 0 },
  }
}, { timestamps: true });

// CRITICAL: Unique index on the COMBINATION of email and role
// This allows the same email to exist once for each role
userSchema.index({ email: 1, role: 1 }, { unique: true });

const User = mongoose.model("User", userSchema);

export default User;
