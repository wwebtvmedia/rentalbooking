import express from "express";
import Booking from "../models/Booking.js";
import Availability from "../models/Availability.js";
import { authMiddleware, requireRole } from "../auth/index.js";
import { validate, bookingSchema } from "../lib/validation.js";
import { encrypt, decrypt, blindIndex, unprotectKey } from "../lib/encryption.js";
import User from "../models/User.js";
import mongoose from "mongoose";

const router = express.Router();

router.use(authMiddleware);

function overlapsQuery(start, end) {
  return { start: { $lt: end }, end: { $gt: start } };
}

// List bookings
router.get("/", async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Token required' });
  try {
    const q = {};
    if (req.query.apartmentId) q.apartmentId = req.query.apartmentId;
    const bookings = await Booking.find(q).sort({ start: 1 }).limit(500);
    
    // Decrypt bookings if user has access
    const decryptedBookings = await Promise.all(bookings.map(async (b) => {
      // For each booking, we need the owner's userKey to decrypt
      // Or if it's the current user's booking, we can use their key if we fetch it
      const owner = await User.findById(b.userId || req.user.id);
      if (!owner) return b.toObject(); // Fallback to raw if owner not found
      
      const isOwner = req.user.id === (b.userId?.toString() || owner._id.toString());
      const isAdmin = req.user.roles.includes('admin');
      
      if (isOwner || isAdmin) {
        return {
          ...b.toObject(),
          fullName: decrypt(b.fullName, owner.userKey),
          email: decrypt(b.email, owner.userKey)
        };
      }
      // If not owner/admin, return masked/encrypted data
      return {
        ...b.toObject(),
        fullName: 'Private Residence',
        email: '***@***.***'
      };
    }));
    
    res.json(decryptedBookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /bookings/:id
router.get('/:id', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Token required' });
  try {
    const b = await Booking.findById(req.params.id);
    if (!b) return res.status(404).json({ error: 'Not found' });
    
    const owner = await User.findById(b.userId || req.user.id);
    const isOwner = req.user.id === (b.userId?.toString() || owner?._id.toString());
    const isAdmin = req.user.roles.includes('admin');
    
    if (owner && (isOwner || isAdmin)) {
      return res.json({
        ...b.toObject(),
        fullName: decrypt(b.fullName, owner.userKey),
        email: decrypt(b.email, owner.userKey)
      });
    }
    
    res.json(b);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create booking (checks conflicts and creates blocking availability)
router.post("/", validate(bookingSchema), async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Token required to book a residence' });
  
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

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

      // Check overlap
      const conflictBooking = await Booking.findOne({
        ...overlapsQuery(s, e),
        status: "confirmed",
        ...aptFilter
      }).session(session);
      if (conflictBooking) throw new Error("CONFLICT");

      const conflictAvail = await Availability.findOne({
        ...overlapsQuery(s, e),
        type: "blocked",
        ...aptFilter
      }).session(session);
      if (conflictAvail) throw new Error("CONFLICT");

      // Encrypt PII
      const encryptedName = encrypt(fullName, user.userKey);
      const encryptedEmail = encrypt(email, user.userKey);
      const emailHash = blindIndex(email);

      // Create booking within the transaction
      const created = await Booking.create([{ 
        fullName: encryptedName, 
        email: encryptedEmail, 
        emailHash,
        userId: user._id,
        apartmentId, 
        start: s, 
        end: e 
      }], { session });
      booking = created[0];

      // ... existing deposit logic ...
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

      await Availability.create([{ start: s, end: e, type: "blocked", bookingId: booking._id, apartmentId, note: "Booked" }], { session });
    });

    // Return decrypted for the creator
    const response = booking.toObject();
    const userKey = unprotectKey(user.userKey);
    response.fullName = decrypt(booking.fullName, userKey);
    response.email = decrypt(booking.email, userKey);

    return res.status(201).json(response);
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
    const isOwner = user && user.email && blindIndex(user.email) === booking.emailHash;
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

;
