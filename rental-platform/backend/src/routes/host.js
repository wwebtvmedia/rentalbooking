import express from 'express';
import Apartment from '../models/Apartment.js';
import Booking from '../models/Booking.js';
import User from '../models/User.js';
import { requireRole, authMiddleware } from '../auth/index.js';

const router = express.Router();
router.use(authMiddleware);

// Get Host specific statistics
router.get('/dashboard', requireRole('host'), async (req, res) => {
  try {
    const hostId = req.user.id;

    // 1. Get Host's Flats
    const flats = await Apartment.find({ hostId });
    const flatIds = flats.map(f => f._id.toString());

    // 2. Aggregate Bookings for these flats
    const bookings = await Booking.find({ 
        apartmentId: { $in: flatIds },
        paymentStatus: 'succeeded' 
    }).sort({ start: -1 });

    // 3. Financial Calculations
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

    // 4. Tax Estimation (Mock calculation: 20% VAT, 5% Local Tax)
    const localTax = totalRevenue * 0.05;
    const vat = totalRevenue * 0.20;

    // 5. Concierge & Guest Mapping
    // Get unique concierge IDs from host's flats
    const conciergeIds = [...new Set(flats.map(f => f.assignedConciergeId).filter(Boolean))];
    const concierges = await User.find({ _id: { $in: conciergeIds } }, 'fullName email');

    res.json({
        summary: {
            flatCount: flats.length,
            totalRevenue,
            monthlyRevenue,
            yearlyRevenue,
            taxDeclarationEstimate: totalRevenue * 0.75, // Assuming 25% deductible
            localTaxPayable: localTax
        },
        flats: flats.map(f => ({
            id: f._id,
            name: f.name,
            revenue: bookings.filter(b => b.apartmentId === f._id.toString()).reduce((acc, curr) => acc + (curr.depositAmount/100), 0)
        })),
        concierges,
        recentBookings: bookings.slice(0, 10)
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
