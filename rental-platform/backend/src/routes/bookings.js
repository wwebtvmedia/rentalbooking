import express from "express";
import Booking from "../models/Booking.js";
import Availability from "../models/Availability.js";
import { authMiddleware, requireRole } from "../auth/index.js";

const router = express.Router();

router.use(authMiddleware);

function overlapsQuery(start, end) {
  return { start: { $lt: end }, end: { $gt: start } };
}

// List bookings
router.get("/", async (req, res) => {
  const q = {};
  if (req.query.apartmentId) q.apartmentId = req.query.apartmentId;
  const bookings = await Booking.find(q).sort({ start: 1 }).limit(500);
  res.json(bookings);
});

// Create booking (checks conflicts and creates blocking availability)
// Creating a booking is still allowed to unauthenticated users (public booking).
router.post("/", async (req, res) => {
  try {
    const { fullName, email, start, end, apartmentId } = req.body;
    if (!fullName || !email || !start || !end) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s) || isNaN(e) || s >= e) {
      return res.status(400).json({ error: "Invalid start/end" });
    }

    // Build apartment-specific query if provided
    const aptFilter = apartmentId ? { apartmentId } : {};

    // Check overlap with existing bookings for the same apartment (or globally if not specified)
    const conflictBooking = await Booking.findOne({
      ...overlapsQuery(s, e),
      status: "confirmed",
      ...aptFilter
    });
    if (conflictBooking) {
      return res.status(409).json({ error: "Time slot already booked" });
    }

    // Check blocked availability conflicts
    const conflictAvail = await Availability.findOne({
      ...overlapsQuery(s, e),
      type: "blocked",
      ...aptFilter
    });
    if (conflictAvail) {
      return res.status(409).json({ error: "Time slot unavailable" });
    }

    const booking = await Booking.create({ fullName, email, apartmentId, start: s, end: e });

    // create a blocking availability tied to this booking
    await Availability.create({ start: s, end: e, type: "blocked", bookingId: booking._id, apartmentId, note: "Booked" });

    return res.status(201).json(booking);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Cancel booking - only admin or the booking email owner can cancel
router.post('/:id/cancel', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Not found' });

    const user = req.user;
    const isAdmin = user && Array.isArray(user.roles) && user.roles.includes('admin');
    const isOwner = user && user.email && user.email === booking.email;
    if (!isAdmin && !isOwner) return res.status(403).json({ error: 'Forbidden' });

    booking.status = 'cancelled';
    await booking.save();
    // remove/clear availability blocks for this booking
    await Availability.deleteMany({ bookingId: booking._id });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
