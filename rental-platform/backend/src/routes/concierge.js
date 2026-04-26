import express from 'express';
import Apartment from '../models/Apartment.js';
import User from '../models/User.js';
import Booking from '../models/Booking.js';
import { requireRole, authMiddleware } from '../auth/index.js';

const router = express.Router();
router.use(authMiddleware);

router.get('/dashboard', requireRole('concierge'), async (req, res) => {
  try {
    const conciergeId = req.user.id;

    // 1. Get assigned flats
    const flats = await Apartment.find({ assignedConciergeId: conciergeId });
    const flatIds = flats.map(f => f._id.toString());

    // 2. Work Schedule (Current and upcoming bookings for these flats)
    const schedule = await Booking.find({ 
        apartmentId: { $in: flatIds },
        end: { $gte: new Date() }
    }).sort({ start: 1 });

    // 3. Financials
    const me = await User.findById(conciergeId);
    const tips = me.metadata?.tipsEarned || 0;
    const taxEstimate = tips * 0.15; // Mock social charges

    // 4. Sub-contractors (List all users with 'contractor' role)
    const contractors = await User.find({ roles: 'contractor' }, 'fullName email metadata.specialties');

    res.json({
        flats: flats.map(f => ({ id: f._id, name: f.name, address: f.address })),
        schedule,
        earnings: {
            tips,
            taxEstimate,
            netTips: tips - taxEstimate
        },
        contractors
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
