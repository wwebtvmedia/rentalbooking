import express from 'express';
import Apartment from '../models/Apartment.js';
import Booking from '../models/Booking.js';
import Availability from '../models/Availability.js';
import User from '../models/User.js';
import { requireRole, authMiddleware } from '../auth/index.js';
import { decrypt, unprotectKey } from '../lib/encryption.js';

const router = express.Router();
router.use(authMiddleware);

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
