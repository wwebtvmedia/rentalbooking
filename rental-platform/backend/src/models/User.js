import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  // Encrypted fields
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  
  // Blind index for lookups (hashed email)
  emailHash: { type: String, required: true },
  
  role: { 
    type: String, 
    enum: ['guest', 'host', 'concierge', 'contractor', 'admin'],
    default: 'guest'
  },

  // Dedicated Encryption Key for this user
  userKey: { type: String, required: true },

  metadata: {
    taxId: { type: String }, // Encrypted
    bankDetails: { type: String }, // Encrypted
    specialties: [String], 
    tipsEarned: { type: Number, default: 0 },
  }
}, { timestamps: true });

// Identity is now (emailHash + role)
userSchema.index({ emailHash: 1, role: 1 }, { unique: true });

const User = mongoose.model("User", userSchema);

export default User;
