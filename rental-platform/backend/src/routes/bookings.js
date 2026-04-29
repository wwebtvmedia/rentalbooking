import express from "express";
import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Availability from "../models/Availability.js";
import Apartment from "../models/Apartment.js";
import User from "../models/User.js";
import { authMiddleware } from "../auth/index.js";
import { validate, bookingSchema } from "../lib/validation.js";
import { encrypt, decrypt, blindIndex, unprotectKey, normalizeEmail } from "../lib/encryption.js";

const router = express.Router();
router.use(authMiddleware);

function overlapsQuery(start, end) {
  return { start: { $lt: end }, end: { $gt: start } };
}

function hasRole(req, role) {
  return Array.isArray(req.user?.roles) && req.user.roles.includes(role);
}

function userOwnsBooking(req, booking) {
  if (!req.user) return false;
  if (booking.userId && booking.userId.toString() === req.user.id) return true;
  return req.user.email && booking.emailHash && blindIndex(req.user.email) === booking.emailHash;
}

async function userCanAccessBooking(req, booking) {
  if (!req.user) return false;
  if (hasRole(req, 'admin') || userOwnsBooking(req, booking)) return true;
  if (!booking.apartmentId || !mongoose.Types.ObjectId.isValid(booking.apartmentId)) return false;

  const apt = await Apartment.findById(booking.apartmentId, 'hostId assignedConciergeId');
  if (!apt) return false;
  if (hasRole(req, 'host') && apt.hostId?.toString() === req.user.id) return true;
  if (hasRole(req, 'concierge') && apt.assignedConciergeId?.toString() === req.user.id) return true;
  return false;
}

async function serializeBooking(booking, req) {
  const obj = booking.toObject ? booking.toObject() : { ...booking };
  const owner = booking.userId ? await User.findById(booking.userId) : null;
  const isAdmin = hasRole(req, 'admin');

  delete obj.emailHash;
  if (!isAdmin) delete obj.paymentIntentId;

  if (owner) {
    try {
      const ownerKey = unprotectKey(owner.userKey);
      obj.fullName = decrypt(booking.fullName, ownerKey);
      obj.email = decrypt(booking.email, ownerKey);
    } catch {
      obj.fullName = 'Private guest';
      obj.email = 'private@example.invalid';
    }
  } else {
    obj.fullName = userOwnsBooking(req, booking) ? req.user.name : 'Private guest';
    obj.email = userOwnsBooking(req, booking) ? req.user.email : 'private@example.invalid';
  }

  return obj;
}

async function scopedBookingQuery(req) {
  const q = {};
  if (req.query.apartmentId) q.apartmentId = req.query.apartmentId;

  if (hasRole(req, 'admin')) return q;

  if (hasRole(req, 'host') || hasRole(req, 'concierge')) {
    const aptQuery = hasRole(req, 'host') ? { hostId: req.user.id } : { assignedConciergeId: req.user.id };
    const apartments = await Apartment.find(aptQuery, '_id');
    const apartmentIds = apartments.map((a) => a._id.toString());
    q.apartmentId = req.query.apartmentId ? req.query.apartmentId : { $in: apartmentIds };
    return q;
  }

  q.$or = [{ userId: req.user.id }];
  if (req.user.email) q.$or.push({ emailHash: blindIndex(req.user.email) });
  return q;
}

router.get("/", async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Token required' });
  try {
    const q = await scopedBookingQuery(req);
    const bookings = await Booking.find(q).sort({ start: 1 }).limit(500);
    const response = await Promise.all(bookings.map((b) => serializeBooking(b, req)));
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Token required' });
  try {
    const b = await Booking.findById(req.params.id);
    if (!b) return res.status(404).json({ error: 'Not found' });
    if (!(await userCanAccessBooking(req, b))) return res.status(404).json({ error: 'Not found' });
    res.json(await serializeBooking(b, req));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", validate(bookingSchema), async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Token required to book a residence' });
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const session = await mongoose.startSession();
  try {
    let booking;
    await session.withTransaction(async () => {
      const { start, end, apartmentId } = req.body;
      if (!start || !end) throw new Error("MISSING_FIELDS");

      const s = new Date(start);
      const e = new Date(end);
      if (isNaN(s.getTime()) || isNaN(e.getTime()) || s >= e) throw new Error("INVALID_DATES");
      if (apartmentId && !mongoose.Types.ObjectId.isValid(apartmentId)) throw new Error("INVALID_APARTMENT");

      if (apartmentId) {
        const aptExists = await Apartment.exists({ _id: apartmentId }).session(session);
        if (!aptExists) throw new Error("INVALID_APARTMENT");
      }

      const aptFilter = apartmentId ? { apartmentId } : {};
      const conflictBooking = await Booking.findOne({ ...overlapsQuery(s, e), status: "confirmed", ...aptFilter }).session(session);
      if (conflictBooking) throw new Error("CONFLICT");

      const conflictAvail = await Availability.findOne({ ...overlapsQuery(s, e), type: "blocked", ...aptFilter }).session(session);
      if (conflictAvail) throw new Error("CONFLICT");

      const userKey = unprotectKey(user.userKey);
      const bookingName = req.user.name || 'Member';
      const bookingEmail = normalizeEmail(req.user.email);
      if (!bookingEmail) throw new Error("MISSING_AUTH_EMAIL");

      const created = await Booking.create([{
        fullName: encrypt(bookingName, userKey),
        email: encrypt(bookingEmail, userKey),
        emailHash: blindIndex(bookingEmail),
        userId: user._id,
        apartmentId,
        start: s,
        end: e
      }], { session });
      booking = created[0];

      let depositAmount = 0;
      if (apartmentId) {
        const apt = await Apartment.findById(apartmentId).session(session);
        if (apt?.depositAmount) depositAmount = apt.depositAmount;
      }
      if (!depositAmount && process.env.DEPOSIT_DEFAULT_AMOUNT) depositAmount = Number(process.env.DEPOSIT_DEFAULT_AMOUNT);

      booking.depositAmount = Number.isFinite(depositAmount) ? depositAmount : 0;
      booking.paymentStatus = booking.depositAmount > 0 ? 'requires_payment_method' : 'none';
      await booking.save({ session });

      await Availability.create([{ start: s, end: e, type: "blocked", bookingId: booking._id, apartmentId, note: "Booked" }], { session });
    });

    return res.status(201).json(await serializeBooking(booking, req));
  } catch (err) {
    if (err.message === "CONFLICT") return res.status(409).json({ error: "Time slot already booked" });
    if (err.message === "MISSING_FIELDS") return res.status(400).json({ error: "Missing required fields" });
    if (err.message === "INVALID_DATES") return res.status(400).json({ error: "Invalid start/end" });
    if (err.message === "INVALID_APARTMENT") return res.status(400).json({ error: "Invalid apartment" });
    if (err.message === "MISSING_AUTH_EMAIL") return res.status(400).json({ error: "Authenticated user email is missing" });
    return res.status(500).json({ error: err.message });
  } finally {
    await session.endSession();
  }
});

router.post('/:id/cancel', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Token required' });
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Not found' });
    if (!(await userCanAccessBooking(req, booking))) return res.status(403).json({ error: 'Forbidden' });

    booking.status = 'cancelled';
    booking.paymentStatus = booking.paymentStatus === 'succeeded' ? booking.paymentStatus : 'canceled';
    await booking.save();
    await Availability.deleteMany({ bookingId: booking._id });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
