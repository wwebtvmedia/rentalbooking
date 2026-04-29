import mongoose from 'mongoose';

const magicTokenSchema = new mongoose.Schema({
  jti: { type: String, required: true, unique: true },
  emailHash: { type: String, required: true, index: true },
  fullName: { type: String },
  requestedRole: { type: String, enum: ['guest', 'host', 'concierge', 'contractor', 'admin'], default: 'guest' },
  redirectOrigin: { type: String },
  used: { type: Boolean, default: false },
  expiresAt: { type: Date, required: true }
}, { timestamps: true });

magicTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const MagicToken = mongoose.model('MagicToken', magicTokenSchema);
export default MagicToken;
