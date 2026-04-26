import express from 'express';
import Apartment from '../models/Apartment.js';
import Booking from '../models/Booking.js';
import Customer from '../models/Customer.js';
import { requireRole, authMiddleware } from '../auth/index.js';

const router = express.Router();

// Apply auth middleware to all admin routes
router.use(authMiddleware);

router.get('/stats', requireRole('admin'), async (req, res) => {
  try {
    // 1. Basic Counts
    const flatCount = await Apartment.countDocuments();
    const customerCount = await Customer.countDocuments();
    const totalBookings = await Booking.countDocuments();

    // 2. Revenue Aggregation (using successfully paid bookings)
    const revenueStats = await Booking.aggregate([
      { $match: { paymentStatus: 'succeeded' } },
      { $group: {
          _id: null,
          totalRevenue: { $sum: "$depositAmount" }, // For now using deposit as revenue indicator
          averageBookingValue: { $avg: "$depositAmount" }
      }}
    ]);

    const totalRevenue = (revenueStats[0]?.totalRevenue || 0) / 100;

    // 3. Revenue by Flat
    const revenueByFlat = await Booking.aggregate([
      { $match: { paymentStatus: 'succeeded' } },
      { $group: {
          _id: "$apartmentId",
          revenue: { $sum: "$depositAmount" },
          bookingCount: { $count: {} }
      }}
    ]);

    // 4. Enrich Revenue by Flat with Apartment details and Location Comparison
    const apartments = await Apartment.find();
    const detailedFlats = apartments.map(apt => {
      const stats = revenueByFlat.find(r => r._id?.toString() === apt._id.toString());
      const revenue = (stats?.revenue || 0) / 100;
      
      // Basic location comparison logic (simple radius or same city if implemented)
      // For this demo, we compare against the global average revenue per flat
      const globalAvg = totalRevenue / (flatCount || 1);
      const comparison = revenue > 0 ? ((revenue - globalAvg) / globalAvg * 100).toFixed(1) : -100;

      return {
        id: apt._id,
        name: apt.name,
        address: apt.address,
        revenue,
        bookings: stats?.bookingCount || 0,
        performanceVsAvg: comparison
      };
    });

    // 5. Booking Statistics (Last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentBookingsCount = await Booking.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });

    res.json({
      summary: {
        totalRevenue,
        flatCount,
        customerCount,
        totalBookings,
        recentBookingsCount
      },
      flats: detailedFlats
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/customers', requireRole('admin'), async (req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
