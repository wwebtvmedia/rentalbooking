import express from 'express';
import Apartment from '../models/Apartment.js';
import Booking from '../models/Booking.js';
import Availability from '../models/Availability.js';
import User from '../models/User.js';
import { requireRole, authMiddleware } from '../auth/index.js';
import { decrypt, unprotectKey } from '../lib/encryption.js';
import { buildInvoice, taxRate } from '../lib/billing.js';

const router = express.Router();
router.use(authMiddleware);

// Decrypt a user's name/email, falling back to a private placeholder if the key is unavailable.
function decryptIdentity(user) {
  try {
    const key = unprotectKey(user.userKey);
    return { fullName: decrypt(user.fullName, key), email: decrypt(user.email, key) };
  } catch {
    return { fullName: 'Private user', email: 'private@example.invalid' };
  }
}

router.get('/stats', requireRole('admin'), async (req, res) => {
  try {
    const flatCount = await Apartment.countDocuments();
    const totalBookings = await Booking.countDocuments();
    const recentBookingsCount = await Booking.countDocuments({ createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } });

    const userRoleCounts = await User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]);

    const revenueStats = await Booking.aggregate([
      { $match: { paymentStatus: 'succeeded' } },
      { $group: { _id: null, totalRevenue: { $sum: "$depositAmount" }, averageBookingValue: { $avg: "$depositAmount" } } }
    ]);

    const totalRevenue = (revenueStats[0]?.totalRevenue || 0) / 100;

    const revenueByFlat = await Booking.aggregate([
      { $match: { paymentStatus: 'succeeded' } },
      { $group: { _id: "$apartmentId", revenue: { $sum: "$depositAmount" }, bookingCount: { $sum: 1 } } }
    ]);

    const apartments = await Apartment.find();
    const detailedFlats = apartments.map(apt => {
      const stats = revenueByFlat.find(r => r._id?.toString() === apt._id.toString());
      const revenue = (stats?.revenue || 0) / 100;
      const globalAvg = totalRevenue / (flatCount || 1);
      const comparison = globalAvg > 0 ? ((revenue - globalAvg) / globalAvg * 100).toFixed(1) : '0.0';
      return { id: apt._id, name: apt.name, address: apt.address, revenue, bookings: stats?.bookingCount || 0, performanceVsAvg: comparison };
    });

    res.json({
      summary: {
        totalRevenue,
        flatCount,
        customerCount: userRoleCounts.find(r => r._id === 'guest')?.count || 0,
        hostCount: userRoleCounts.find(r => r._id === 'host')?.count || 0,
        conciergeCount: userRoleCounts.find(r => r._id === 'concierge')?.count || 0,
        totalBookings,
        recentBookingsCount,
      },
      flats: detailedFlats
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/customers', requireRole('admin'), async (req, res) => {
  try {
    const users = await User.find({ role: 'guest' }).sort({ createdAt: -1 }).limit(50);
    const decryptedUsers = users.map(u => {
      const userKey = unprotectKey(u.userKey);
      return { _id: u._id, fullName: decrypt(u.fullName, userKey), email: decrypt(u.email, userKey), createdAt: u.createdAt };
    });
    res.json(decryptedUsers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Per-GUEST statistics: number of connections (logins), number of rentals,
// concierge-serviced stays, tips received and total spend. Powers the admin
// "by guest" intelligence page.
router.get('/guests', requireRole('admin'), async (req, res) => {
  try {
    const guests = await User.find({ role: 'guest' }).sort({ createdAt: -1 });

    // Which flats have a concierge assigned (for the "conciergery" metric).
    const apartments = await Apartment.find({}, '_id assignedConciergeId');
    const conciergeFlatIds = apartments.filter(a => a.assignedConciergeId).map(a => a._id.toString());

    // Rentals + spend per guest. "rentals" counts every booking the guest made
    // (any status); "spent" counts only settled (succeeded) payments.
    const rentalAgg = await Booking.aggregate([
      { $match: { userId: { $ne: null } } },
      { $group: { _id: '$userId', rentals: { $sum: 1 } } },
    ]);
    const spendAgg = await Booking.aggregate([
      { $match: { userId: { $ne: null }, paymentStatus: 'succeeded' } },
      { $group: { _id: '$userId', spent: { $sum: '$depositAmount' } } },
    ]);
    const conciergeAgg = await Booking.aggregate([
      { $match: { userId: { $ne: null }, apartmentId: { $in: conciergeFlatIds } } },
      { $group: { _id: '$userId', conciergeStays: { $sum: 1 } } },
    ]);
    const rentalsBy = new Map(rentalAgg.map(r => [String(r._id), r.rentals]));
    const spentBy = new Map(spendAgg.map(r => [String(r._id), r.spent]));
    const conciergeBy = new Map(conciergeAgg.map(r => [String(r._id), r.conciergeStays]));

    const out = guests.map(u => {
      const id = u._id.toString();
      return {
        id: u._id,
        ...decryptIdentity(u),
        connections: u.loginCount || 0,
        lastLoginAt: u.lastLoginAt || null,
        rentals: rentalsBy.get(id) || 0,
        conciergeStays: conciergeBy.get(id) || 0,
        totalSpent: (spentBy.get(id) || 0) / 100,
        tips: u.metadata?.tipsEarned || 0,
      };
    });
    res.json({ count: out.length, guests: out });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Per-HOST statistics: connections, residences owned, rentals + revenue across
// their flats, concierge coverage, tips, and the AUTOMATIC TAX computed from the
// configured TAX_RATE. Powers the admin "by host" intelligence page.
router.get('/hosts', requireRole('admin'), async (req, res) => {
  try {
    const rate = taxRate();
    const hosts = await User.find({ role: 'host' }).sort({ createdAt: -1 });
    const apartments = await Apartment.find({}, '_id hostId assignedConciergeId');

    const rentalAgg = await Booking.aggregate([
      { $group: { _id: '$apartmentId', rentals: { $sum: 1 } } },
    ]);
    const revenueAgg = await Booking.aggregate([
      { $match: { paymentStatus: 'succeeded' } },
      { $group: { _id: '$apartmentId', revenue: { $sum: '$depositAmount' } } },
    ]);
    const rentalsByFlat = new Map(rentalAgg.map(r => [String(r._id), r.rentals]));
    const revenueByFlat = new Map(revenueAgg.map(r => [String(r._id), r.revenue]));

    const out = hosts.map(u => {
      const myFlats = apartments.filter(a => a.hostId?.toString() === u._id.toString());
      let rentals = 0, revenueCents = 0;
      myFlats.forEach(f => {
        rentals += rentalsByFlat.get(f._id.toString()) || 0;
        revenueCents += revenueByFlat.get(f._id.toString()) || 0;
      });
      const revenue = revenueCents / 100;
      const automaticTax = Number((revenue * rate).toFixed(2));
      const conciergeCount = new Set(myFlats.map(f => f.assignedConciergeId?.toString()).filter(Boolean)).size;
      return {
        id: u._id,
        ...decryptIdentity(u),
        connections: u.loginCount || 0,
        lastLoginAt: u.lastLoginAt || null,
        flatCount: myFlats.length,
        rentals,
        revenue: Number(revenue.toFixed(2)),
        concierges: conciergeCount,
        tips: u.metadata?.tipsEarned || 0,
        taxRate: rate,
        automaticTax,
        netRevenue: Number((revenue - automaticTax).toFixed(2)),
      };
    });
    res.json({ taxRate: rate, count: out.length, hosts: out });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate a downloadable tax invoice (bill) for a host across their flats'
// settled bookings, optionally bounded to a [from, to] period. Tax is applied
// automatically from TAX_RATE.
router.get('/hosts/:id/invoice', requireRole('admin'), async (req, res) => {
  try {
    const host = await User.findById(req.params.id);
    if (!host || host.role !== 'host') return res.status(404).json({ error: 'Host not found' });

    const flats = await Apartment.find({ hostId: host._id }, '_id');
    const flatIds = flats.map(f => f._id.toString());
    const { from, to } = req.query;
    const q = { apartmentId: { $in: flatIds }, paymentStatus: 'succeeded' };
    if (from || to) {
      q.start = {};
      if (from) q.start.$gte = new Date(from);
      if (to) q.start.$lte = new Date(to);
    }
    const bookings = await Booking.find(q).sort({ start: 1 });
    const { fullName } = decryptIdentity(host);
    const invoice = buildInvoice({
      invoiceFor: { id: host._id, name: fullName, role: 'host' },
      bookings,
      from: from || null,
      to: to || null,
    });
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/users/:id', requireRole('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user._id.toString() === req.user.id) return res.status(400).json({ error: 'Cannot remove your own admin account' });

    const bookings = await Booking.find({ userId: user._id }, '_id');
    const bookingIds = bookings.map(b => b._id);
    await Availability.deleteMany({ bookingId: { $in: bookingIds } });
    await Booking.deleteMany({ userId: user._id });
    await user.deleteOne();
    res.json({ ok: true, message: 'User and linked bookings removed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
