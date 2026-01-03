import mongoose from 'mongoose';

const magicTokenSchema = new mongoose.Schema({
  jti: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  used: { type: Boolean, default: false },
  expiresAt: { type: Date, required: true }
});

// TTL index to automatically remove expired tokens
magicTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const MagicToken = mongoose.model('MagicToken', magicTokenSchema);
export default MagicToken;
