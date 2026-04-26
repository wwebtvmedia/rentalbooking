import express from "express";
import Booking from "../models/Booking.js";
import Availability from "../models/Availability.js";
import { authMiddleware, requireRole } from "../auth/index.js";
import { validate, bookingSchema } from "../lib/validation.js";
import mongoose from "mongoose";

const router = express.Router();

router.use(authMiddleware);

function overlapsQuery(start, end) {
  return { start: { $lt: end }, end: { $gt: start } };
}

// List bookings
router.get("/", async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Token required' });
  const q = {};
  if (req.query.apartmentId) q.apartmentId = req.query.apartmentId;
  const bookings = await Booking.find(q).sort({ start: 1 }).limit(500);
  res.json(bookings);
});

// GET /bookings/:id
router.get('/:id', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Token required' });
  try {
    const b = await Booking.findById(req.params.id);
    if (!b) return res.status(404).json({ error: 'Not found' });
    res.json(b);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create booking (checks conflicts and creates blocking availability)
router.post("/", validate(bookingSchema), async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Token required to book a residence' });
  const session = await mongoose.startSession();
  try {
    let booking;
    await session.withTransaction(async () => {
      const { fullName, email, start, end, apartmentId } = req.body;
      if (!fullName || !email || !start || !end) {
        throw new Error("MISSING_FIELDS");
      }
      const s = new Date(start);
      const e = new Date(end);
      if (isNaN(s) || isNaN(e) || s >= e) {
        throw new Error("INVALID_DATES");
      }

      // Build apartment-specific query if provided
      const aptFilter = apartmentId ? { apartmentId } : {};

      // Check overlap with existing bookings for the same apartment (or globally if not specified)
      const conflictBooking = await Booking.findOne({
        ...overlapsQuery(s, e),
        status: "confirmed",
        ...aptFilter
      }).session(session);
      if (conflictBooking) {
        throw new Error("CONFLICT");
      }

      // Check blocked availability conflicts
      const conflictAvail = await Availability.findOne({
        ...overlapsQuery(s, e),
        type: "blocked",
        ...aptFilter
      }).session(session);
      if (conflictAvail) {
        throw new Error("CONFLICT");
      }

      // Create booking within the transaction
      const created = await Booking.create([{ fullName, email, apartmentId, start: s, end: e }], { session });
      booking = created[0];

      // Determine deposit amount
      let depositAmount = 0;
      if (apartmentId && mongoose.Types.ObjectId.isValid(apartmentId)) {
        const Apartment = (await import('../models/Apartment.js')).default;
        const apt = await Apartment.findById(apartmentId).session(session);
        if (apt && apt.depositAmount) depositAmount = apt.depositAmount;
      }
      if (!depositAmount && process.env.DEPOSIT_DEFAULT_AMOUNT) depositAmount = Number(process.env.DEPOSIT_DEFAULT_AMOUNT);

      booking.depositAmount = depositAmount;
      booking.paymentStatus = depositAmount > 0 ? 'requires_payment_method' : 'none';
      await booking.save({ session });

      // create a blocking availability tied to this booking
      await Availability.create([{ start: s, end: e, type: "blocked", bookingId: booking._id, apartmentId, note: "Booked" }], { session });
    });

    return res.status(201).json(booking);
  } catch (err) {
    console.error('Booking creation error:', err);
    if (err.message === "CONFLICT") {
      return res.status(409).json({ error: "Time slot already booked" });
    }
    if (err.message === "MISSING_FIELDS") {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (err.message === "INVALID_DATES") {
      return res.status(400).json({ error: "Invalid start/end" });
    }
    return res.status(500).json({ error: err.message });
  } finally {
    await session.endSession();
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
