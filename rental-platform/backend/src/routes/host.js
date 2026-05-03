import express from 'express';
import Apartment from '../models/Apartment.js';
import Booking from '../models/Booking.js';
import User from '../models/User.js';
import { requireRole, authMiddleware } from '../auth/index.js';
import { decrypt, unprotectKey } from '../lib/encryption.js';

const router = express.Router();
router.use(authMiddleware);

function safePublicUser(user) {
  if (!user) return null;
  try {
    const key = unprotectKey(user.userKey);
    return { id: user._id, fullName: decrypt(user.fullName, key), email: decrypt(user.email, key), role: user.role };
  } catch {
    return { id: user._id, fullName: 'Private user', email: 'private@example.invalid', role: user.role };
  }
}

async function safeBooking(booking) {
  const obj = booking.toObject ? booking.toObject() : { ...booking };
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
  } else {
    obj.fullName = 'Private guest';
    obj.email = 'private@example.invalid';
  }
  return obj;
}

router.get('/dashboard', requireRole('host'), async (req, res) => {
  try {
    const hostId = req.user.id;
    const flats = await Apartment.find({ hostId });
    const flatIds = flats.map(f => f._id.toString());

    const bookings = await Booking.find({ apartmentId: { $in: flatIds }, paymentStatus: 'succeeded' }).sort({ start: -1 });

    let totalRevenue = 0;
    const monthlyRevenue = {};
    const yearlyRevenue = {};

    bookings.forEach(b => {
      const amount = (b.depositAmount || 0) / 100;
      totalRevenue += amount;
      const date = new Date(b.start);
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
      const yearKey = `${date.getFullYear()}`;
      monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + amount;
      yearlyRevenue[yearKey] = (yearlyRevenue[yearKey] || 0) + amount;
    });

    const localTax = totalRevenue * 0.05;
    const conciergeIds = [...new Set(flats.map(f => f.assignedConciergeId?.toString()).filter(Boolean))];
    const concierges = await User.find({ _id: { $in: conciergeIds } });

    res.json({
      summary: {
        flatCount: flats.length,
        totalRevenue,
        monthlyRevenue,
        yearlyRevenue,
        taxDeclarationEstimate: totalRevenue * 0.75,
        localTaxPayable: localTax
      },
      flats: flats.map(f => ({
        id: f._id,
        name: f.name,
        address: f.address,
        revenue: bookings.filter(b => b.apartmentId === f._id.toString()).reduce((acc, curr) => acc + ((curr.depositAmount || 0) / 100), 0)
      })),
      concierges: concierges.map(safePublicUser),
      recentBookings: await Promise.all(bookings.slice(0, 10).map(safeBooking))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
