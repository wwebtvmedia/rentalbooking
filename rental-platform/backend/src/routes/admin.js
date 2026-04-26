import express from 'express';
import Apartment from '../models/Apartment.js';
import Booking from '../models/Booking.js';
import User from '../models/User.js';
import { requireRole, authMiddleware } from '../auth/index.js';
import { decrypt } from '../lib/encryption.js';

const router = express.Router();
router.use(authMiddleware);

router.get('/stats', requireRole('admin'), async (req, res) => {
  // Secondary Security Layer: Check for Platform Admin Key
  const adminKey = req.headers['x-platform-admin-key'];
  if (process.env.NODE_ENV === 'production' && adminKey !== process.env.PLATFORM_ADMIN_KEY) {
      return res.status(403).json({ error: 'Invalid Platform Admin Key' });
  }

  try {
    const flatCount = await Apartment.countDocuments();
    const totalBookings = await Booking.countDocuments();
    
    // ANONYMIZED STATS: We only get the total count of users per role
    const userRoleCounts = await User.aggregate([
        { $group: { _id: "$role", count: { $sum: 1 } } }
    ]);

    const revenueStats = await Booking.aggregate([
      { $match: { paymentStatus: 'succeeded' } },
      { $group: {
          _id: null,
          totalRevenue: { $sum: "$depositAmount" },
          averageBookingValue: { $avg: "$depositAmount" }
      }}
    ]);

    const totalRevenue = (revenueStats[0]?.totalRevenue || 0) / 100;

    const revenueByFlat = await Booking.aggregate([
      { $match: { paymentStatus: 'succeeded' } },
      { $group: {
          _id: "$apartmentId",
          revenue: { $sum: "$depositAmount" },
          bookingCount: { $count: {} }
      }}
    ]);

    const apartments = await Apartment.find();
    const detailedFlats = apartments.map(apt => {
      const stats = revenueByFlat.find(r => r._id?.toString() === apt._id.toString());
      const revenue = (stats?.revenue || 0) / 100;
      const globalAvg = totalRevenue / (flatCount || 1);
      const comparison = revenue > 0 ? ((revenue - globalAvg) / globalAvg * 100).toFixed(1) : -100;

      return {
        id: apt._id,
        name: apt.name, // Apartment name is non-sensitive
        revenue,
        bookings: stats?.bookingCount || 0,
        performanceVsAvg: comparison
      };
    });

    res.json({
      summary: {
        totalRevenue,
        flatCount,
        customerCount: userRoleCounts.find(r => r._id === 'guest')?.count || 0,
        hostCount: userRoleCounts.find(r => r._id === 'host')?.count || 0,
        conciergeCount: userRoleCounts.find(r => r._id === 'concierge')?.count || 0,
        totalBookings,
      },
      flats: detailedFlats
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/customers', requireRole('admin'), async (req, res) => {
  try {
    // Only return recent members with DECRYPTED names for the admin dashboard
    const users = await User.find({ role: 'guest' }).sort({ createdAt: -1 }).limit(50);
    const decryptedUsers = users.map(u => ({
        _id: u._id,
        fullName: decrypt(u.fullName, u.userKey),
        email: decrypt(u.email, u.userKey),
        createdAt: u.createdAt
    }));
    res.json(decryptedUsers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/users/:id', requireRole('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Prevent deleting yourself
    if (user._id.toString() === req.user.id) {
        return res.status(400).json({ error: 'Cannot remove your own admin account' });
    }

    await user.deleteOne();
    res.json({ ok: true, message: 'User removed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
