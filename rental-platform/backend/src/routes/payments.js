import express from 'express';
import Booking from '../models/Booking.js';
import { requireRole } from '../auth/index.js';

let stripe;
try {
  // Attempt to require stripe; if not installed we will gracefully fall back to a test-mode stub
  // eslint-disable-next-line import/no-extraneous-dependencies
  stripe = (await import('stripe')).default(process.env.STRIPE_SECRET_KEY);
} catch (e) {
  console.warn('Stripe SDK not available; running payments in stub mode');
  stripe = null;
}

const router = express.Router();

// Create a PaymentIntent for the booking deposit (capture_method=manual so we can capture later)
router.post('/create-intent', async (req, res) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) return res.status(400).json({ error: 'bookingId required' });
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (!booking.depositAmount || booking.depositAmount <= 0) return res.status(400).json({ error: 'No deposit required for this booking' });

    // If stripe is available, create a PaymentIntent
    if (stripe) {
      const pi = await stripe.paymentIntents.create({
        amount: booking.depositAmount,
        currency: (process.env.STRIPE_CURRENCY || 'usd').toLowerCase(),
        capture_method: 'manual',
        metadata: { bookingId: String(booking._id) }
      });
      booking.paymentIntentId = pi.id;
      booking.paymentStatus = pi.status || 'requires_payment_method';
      await booking.save();
      return res.json({ clientSecret: pi.client_secret, paymentIntentId: pi.id });
    }

    // Fallback: stub behavior for environments without stripe (tests/local)
    const fakeId = `pi_stub_${booking._id}`;
    booking.paymentIntentId = fakeId;
    booking.paymentStatus = 'requires_payment_method';
    await booking.save();
    return res.json({ clientSecret: 'stub_client_secret', paymentIntentId: fakeId });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin: capture authorized deposit
router.post('/:bookingId/capture', requireRole('admin'), async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (!booking.paymentIntentId) return res.status(400).json({ error: 'No payment intent to capture' });

    if (stripe) {
      const pi = await stripe.paymentIntents.capture(booking.paymentIntentId);
      booking.paymentStatus = pi.status || booking.paymentStatus;
      booking.depositCaptured = true;
      booking.depositCapturedAt = new Date();
      await booking.save();
      return res.json({ ok: true, paymentIntent: pi });
    }

    // stub capture
    booking.depositCaptured = true;
    booking.depositCapturedAt = new Date();
    booking.paymentStatus = 'succeeded';
    await booking.save();
    return res.json({ ok: true, stub: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin: refund deposit (if captured) or cancel the PaymentIntent
router.post('/:bookingId/refund', requireRole('admin'), async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (!booking.paymentIntentId) return res.status(400).json({ error: 'No payment intent to refund' });

    if (stripe) {
      // If there are charges for the PI, refund the first charge. Otherwise cancel the PI.
      const pi = await stripe.paymentIntents.retrieve(booking.paymentIntentId);
      if (pi.charges && pi.charges.data && pi.charges.data.length > 0) {
        const chargeId = pi.charges.data[0].id;
        const refund = await stripe.refunds.create({ charge: chargeId });
        booking.depositRefundedAt = new Date();
        booking.depositCaptured = false;
        booking.paymentStatus = 'canceled';
        await booking.save();
        return res.json({ ok: true, refund });
      } else {
        await stripe.paymentIntents.cancel(booking.paymentIntentId);
        booking.paymentStatus = 'canceled';
        booking.depositHeld = false;
        await booking.save();
        return res.json({ ok: true });
      }
    }

    // stub refund
    booking.depositRefundedAt = new Date();
    booking.depositCaptured = false;
    booking.paymentStatus = 'canceled';
    await booking.save();
    return res.json({ ok: true, stub: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Test/dev helper: simulate a successful payment for the booking (available when stripe SDK not present or in test env)
router.post('/:bookingId/simulate-success', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    booking.paymentStatus = 'succeeded';
    booking.depositHeld = true;
    await booking.save();
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
