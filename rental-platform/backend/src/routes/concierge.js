import express from 'express';
import Apartment from '../models/Apartment.js';
import User from '../models/User.js';
import Booking from '../models/Booking.js';
import { requireRole, authMiddleware } from '../auth/index.js';
import { decrypt, unprotectKey } from '../lib/encryption.js';

const router = express.Router();
router.use(authMiddleware);

function safePublicUser(user) {
  if (!user) return null;
  try {
    const key = unprotectKey(user.userKey);
    return { id: user._id, fullName: decrypt(user.fullName, key), email: decrypt(user.email, key), role: user.role, metadata: user.metadata };
  } catch {
    return { id: user._id, fullName: 'Private user', email: 'private@example.invalid', role: user.role, metadata: user.metadata };
  }
}

async function safeBooking(booking) {
  const obj = booking.toObject();
  const owner = booking.userId ? await User.findById(booking.userId) : null;
  delete obj.emailHash;
  delete obj.paymentIntentId;
  if (owner) {
    try {
      const key = unprotectKey(owner.userKey);
      obj.fullName = decrypt(booking.fullName, key);
      obj.email = decrypt(booking.email, key);
    } catch {
      obj.fullName = 'Private guest';
      obj.email = 'private@example.invalid';
    }
  }
  return obj;
}

router.get('/dashboard', requireRole('concierge'), async (req, res) => {
  try {
    const conciergeId = req.user.id;
    const flats = await Apartment.find({ assignedConciergeId: conciergeId });
    const flatIds = flats.map(f => f._id.toString());

    const schedule = await Booking.find({ apartmentId: { $in: flatIds }, end: { $gte: new Date() } }).sort({ start: 1 });
    const me = await User.findById(conciergeId);
    const tips = me?.metadata?.tipsEarned || 0;
    const taxEstimate = tips * 0.15;

    const contractors = await User.find({ role: 'contractor' });

    res.json({
      flats: flats.map(f => ({ id: f._id, name: f.name, address: f.address })),
      schedule: await Promise.all(schedule.map(safeBooking)),
      earnings: { tips, taxEstimate, netTips: tips - taxEstimate },
      contractors: contractors.map(safePublicUser)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
