import express from 'express';
import Booking from '../models/Booking.js';
import { authMiddleware, requireRole } from '../auth/index.js';
import { blindIndex } from '../lib/encryption.js';

const stripeSecret = process.env.STRIPE_SECRET_KEY;
let stripe = null;
if (stripeSecret) {
  try {
    stripe = (await import('stripe')).default(stripeSecret);
  } catch {
    stripe = null;
  }
}

const router = express.Router();
router.use(authMiddleware);

function hasRole(req, role) {
  return Array.isArray(req.user?.roles) && req.user.roles.includes(role);
}

function isOwnerOrAdmin(req, booking) {
  if (!req.user) return false;
  if (hasRole(req, 'admin')) return true;
  if (booking.userId && booking.userId.toString() === req.user.id) return true;
  return req.user.email && booking.emailHash && blindIndex(req.user.email) === booking.emailHash;
}

function validateTxHash(txHash) {
  return /^0x[a-fA-F0-9]{64}$/.test(String(txHash || ''));
}

router.post('/create-intent', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const { bookingId } = req.body;
    if (!bookingId) return res.status(400).json({ error: 'bookingId required' });

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (!isOwnerOrAdmin(req, booking)) return res.status(403).json({ error: 'Forbidden' });
    if (!booking.depositAmount || booking.depositAmount <= 0) return res.status(400).json({ error: 'No deposit required for this booking' });
    if (booking.paymentStatus === 'succeeded') return res.status(400).json({ error: 'Booking is already paid' });

    if (stripe) {
      const existingIntent = booking.paymentIntentId ? await stripe.paymentIntents.retrieve(booking.paymentIntentId).catch(() => null) : null;
      if (existingIntent && !['canceled', 'succeeded'].includes(existingIntent.status)) {
        return res.json({ clientSecret: existingIntent.client_secret, paymentIntentId: existingIntent.id });
      }

      const pi = await stripe.paymentIntents.create({
        amount: booking.depositAmount,
        currency: (process.env.STRIPE_CURRENCY || 'usd').toLowerCase(),
        capture_method: 'manual',
        metadata: { bookingId: String(booking._id), userId: String(booking.userId || '') }
      });
      booking.paymentIntentId = pi.id;
      booking.paymentStatus = pi.status || 'requires_payment_method';
      await booking.save();
      return res.json({ clientSecret: pi.client_secret, paymentIntentId: pi.id });
    }

    if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({ error: 'Stripe is not configured' });
    }

    const fakeId = `pi_stub_${booking._id}`;
    booking.paymentIntentId = fakeId;
    booking.paymentStatus = 'requires_payment_method';
    await booking.save();
    return res.json({ clientSecret: 'stub_client_secret', paymentIntentId: fakeId });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/:bookingId/capture', requireRole('admin'), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (!booking.paymentIntentId && !booking.cryptoTxHash) return res.status(400).json({ error: 'No payment to capture' });

    if (booking.cryptoTxHash && !booking.paymentIntentId) {
      booking.depositCaptured = true;
      booking.depositCapturedAt = new Date();
      booking.paymentStatus = 'succeeded';
      booking.depositHeld = true;
      await booking.save();
      return res.json({ ok: true, crypto: true });
    }

    if (stripe) {
      const pi = await stripe.paymentIntents.capture(booking.paymentIntentId);
      booking.paymentStatus = pi.status || booking.paymentStatus;
      booking.depositCaptured = true;
      booking.depositCapturedAt = new Date();
      await booking.save();
      return res.json({ ok: true, paymentIntent: pi });
    }

    if (process.env.NODE_ENV === 'production') return res.status(503).json({ error: 'Stripe is not configured' });

    booking.depositCaptured = true;
    booking.depositCapturedAt = new Date();
    booking.paymentStatus = 'succeeded';
    await booking.save();
    return res.json({ ok: true, stub: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/:bookingId/refund', requireRole('admin'), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (!booking.paymentIntentId && !booking.cryptoTxHash) return res.status(400).json({ error: 'No payment to refund/cancel' });

    if (booking.cryptoTxHash && !booking.paymentIntentId) {
      booking.depositRefundedAt = new Date();
      booking.depositCaptured = false;
      booking.depositHeld = false;
      booking.paymentStatus = 'canceled';
      await booking.save();
      return res.json({ ok: true, crypto: true, note: 'Marked as refunded/canceled; verify the crypto refund manually.' });
    }

    if (stripe) {
      const pi = await stripe.paymentIntents.retrieve(booking.paymentIntentId);
      if (pi.charges?.data?.length > 0) {
        const refund = await stripe.refunds.create({ charge: pi.charges.data[0].id });
        booking.depositRefundedAt = new Date();
        booking.depositCaptured = false;
        booking.depositHeld = false;
        booking.paymentStatus = 'canceled';
        await booking.save();
        return res.json({ ok: true, refund });
      }
      await stripe.paymentIntents.cancel(booking.paymentIntentId);
      booking.paymentStatus = 'canceled';
      booking.depositHeld = false;
      await booking.save();
      return res.json({ ok: true });
    }

    if (process.env.NODE_ENV === 'production') return res.status(503).json({ error: 'Stripe is not configured' });

    booking.depositRefundedAt = new Date();
    booking.depositCaptured = false;
    booking.depositHeld = false;
    booking.paymentStatus = 'canceled';
    await booking.save();
    return res.json({ ok: true, stub: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/:bookingId/simulate-success', async (req, res) => {
  if (process.env.NODE_ENV === 'production') return res.status(403).json({ error: 'Not available in production' });
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (!isOwnerOrAdmin(req, booking)) return res.status(403).json({ error: 'Forbidden' });

    booking.paymentStatus = 'succeeded';
    booking.depositHeld = true;
    await booking.save();
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/record-crypto-payment', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const { bookingId, txHash, currency } = req.body;
    if (!bookingId || !txHash) return res.status(400).json({ error: 'bookingId and txHash required' });
    if (!validateTxHash(txHash)) return res.status(400).json({ error: 'Invalid transaction hash' });

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (!isOwnerOrAdmin(req, booking)) return res.status(403).json({ error: 'Forbidden' });
    if (booking.paymentStatus === 'succeeded') return res.status(400).json({ error: 'Booking is already paid' });

    booking.cryptoTxHash = txHash;
    booking.paymentCurrency = currency || 'USDC';

    if (process.env.NODE_ENV === 'production') {
      booking.paymentStatus = 'requires_capture';
      booking.depositHeld = false;
      await booking.save();
      return res.json({ ok: true, status: 'pending_manual_verification', message: 'Transaction hash saved. Admin verification is required before marking paid.' });
    }

    booking.paymentStatus = 'succeeded';
    booking.depositHeld = true;
    await booking.save();
    return res.json({ ok: true, status: 'succeeded', booking });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
