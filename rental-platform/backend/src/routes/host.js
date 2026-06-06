import express from 'express';
import Apartment from '../models/Apartment.js';
import Booking from '../models/Booking.js';
import User from '../models/User.js';
import { requireRole, authMiddleware } from '../auth/index.js';
import { decrypt, unprotectKey } from '../lib/encryption.js';
import { buildPayload } from './apartments.js';
import { validate, apartmentSchema } from '../lib/validation.js';
import { sendFlatValidationEmail } from '../auth/mailer.js';
import { logger } from '../logger.js';
import jwt from 'jsonwebtoken';

const router = express.Router();
router.use(authMiddleware);

function jwtSecret() {
  return process.env.AUTH_JWT_SECRET || process.env.JWT_SECRET;
}

function buildValidateUrl(req, flatId) {
  const token = jwt.sign({ flatId: String(flatId), purpose: 'flat-validation' }, jwtSecret(), { expiresIn: '7d' });
  const base = process.env.BACKEND_ORIGIN
    ? process.env.BACKEND_ORIGIN.replace(/\/$/, '')
    : `${String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() || req.protocol}://${req.get('host')}`;
  return `${base}/admin/host/flats/validate?token=${encodeURIComponent(token)}`;
}

// Public: an admin clicks the emailed link to approve a pending flat and publish it.
// Token-protected (signed), so it needs no logged-in session — works straight from email.
router.get('/flats/validate', async (req, res) => {
  try {
    const payload = jwt.verify(String(req.query.token || ''), jwtSecret());
    if (payload.purpose !== 'flat-validation' || !payload.flatId) {
      return res.status(400).send('<h1>Invalid validation link</h1>');
    }
    const apt = await Apartment.findById(payload.flatId);
    if (!apt) return res.status(404).send('<h1>Flat not found</h1>');
    if (apt.status === 'published') {
      return res.status(200).send(`<h1>Already published</h1><p>${apt.name} is already live on Book Now.</p>`);
    }
    apt.status = 'published';
    await apt.save();
    logger.info({ flatId: String(apt._id) }, 'FLAT_VALIDATION: published by admin link');
    res.status(200).send(`<h1>✓ Published</h1><p>"${apt.name}" is now live on Book Now.</p>`);
  } catch (err) {
    res.status(400).send('<h1>Invalid or expired validation link</h1>');
  }
});

// Host self-service: a host customer proposes a new flat (owned by themselves).
// The flat is created as 'pending' (hidden from the public list) and an admin is
// emailed a validation link to approve and publish it. Ownership is forced to the host.
router.post('/flats', requireRole('host'), validate(apartmentSchema), async (req, res) => {
  try {
    const payload = await buildPayload(req.body);
    payload.hostId = req.user.id;
    payload.status = 'pending';
    const apt = await Apartment.create(payload);

    // Email the admin a validation link (best-effort: do not fail the submission if mail fails).
    try {
      await sendFlatValidationEmail(apt, buildValidateUrl(req, apt._id));
    } catch (mailErr) {
      logger.error({ err: mailErr.message, flatId: String(apt._id) }, 'FLAT_SUBMIT: validation email failed');
    }

    res.status(201).json({
      ok: true,
      status: 'pending',
      message: 'Flat submitted. An admin must approve it via the emailed link before it appears on Book Now.',
      flat: apt
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Host self-service: list the flats I own (including pending ones awaiting approval).
router.get('/flats', requireRole('host'), async (req, res) => {
  try {
    const flats = await Apartment.find({ hostId: req.user.id }).sort({ name: 1 });
    res.json(flats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function safePublicUser(user) {
  if (!user) return null;
  try {
    const key = unprotectKey(user.userKey);
    return { id: user._id, fullName: decrypt(user.fullName, key), email: decrypt(user.email, key), role: user.role };
  } catch {
    return { id: user._id, fullName: 'Private user', email: 'private@example.invalid', role: user.role };
  }
}

async function safeBooking(booking) {
  const obj = booking.toObject ? booking.toObject() : { ...booking };
  const owner = booking.userId ? await User.findById(booking.userId) : null;
  delete obj.emailHash;
  delete obj.paymentIntentId;
  if (owner) {
    try {
      const key = unprotectKey(owner.userKey);
      obj.fullName = decrypt(booking.fullName, key);
      obj.email = decrypt(booking.email, key);
    } catch {
      obj.fullName = 'Private guest';
      obj.email = 'private@example.invalid';
    }
  } else {
    obj.fullName = 'Private guest';
    obj.email = 'private@example.invalid';
  }
  return obj;
}

router.get('/dashboard', requireRole('host'), async (req, res) => {
  try {
    const hostId = req.user.id;
    const flats = await Apartment.find({ hostId });
    const flatIds = flats.map(f => f._id.toString());

    const bookings = await Booking.find({ apartmentId: { $in: flatIds }, paymentStatus: 'succeeded' }).sort({ start: -1 });

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

    const localTax = totalRevenue * 0.05;
    const conciergeIds = [...new Set(flats.map(f => f.assignedConciergeId?.toString()).filter(Boolean))];
    const concierges = await User.find({ _id: { $in: conciergeIds } });

    res.json({
      summary: {
        flatCount: flats.length,
        totalRevenue,
        monthlyRevenue,
        yearlyRevenue,
        taxDeclarationEstimate: totalRevenue * 0.75,
        localTaxPayable: localTax
      },
      flats: flats.map(f => ({
        id: f._id,
        name: f.name,
        address: f.address,
        revenue: bookings.filter(b => b.apartmentId === f._id.toString()).reduce((acc, curr) => acc + ((curr.depositAmount || 0) / 100), 0)
      })),
      concierges: concierges.map(safePublicUser),
      recentBookings: await Promise.all(bookings.slice(0, 10).map(safeBooking))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
