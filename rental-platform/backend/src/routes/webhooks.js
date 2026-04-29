import Booking from '../models/Booking.js';

const stripeSecret = process.env.STRIPE_SECRET_KEY;
let stripe = null;
if (stripeSecret) {
  try {
    stripe = (await import('stripe')).default(stripeSecret);
  } catch {
    stripe = null;
  }
}

async function updateBookingFromPaymentIntent(obj, updates) {
  const bookingId = obj?.metadata?.bookingId;
  if (!bookingId) return;
  const b = await Booking.findById(bookingId);
  if (!b) return;

  // Prevent forged/mismatched events from updating another booking.
  if (b.paymentIntentId && obj.id && b.paymentIntentId !== obj.id) return;

  Object.assign(b, updates);
  await b.save();
}

export async function stripeWebhookHandler(req, res) {
  const sig = req.headers['stripe-signature'];
  try {
    let event;
    if (stripe && process.env.STRIPE_WEBHOOK_SECRET && sig) {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } else {
      if (process.env.NODE_ENV === 'production') {
        return res.status(400).send('Missing Stripe webhook signature or secret');
      }
      try {
        event = typeof req.body === 'string'
          ? JSON.parse(req.body)
          : (req.body && req.body.length ? JSON.parse(req.body.toString()) : req.body);
      } catch {
        return res.status(400).send('Invalid webhook payload');
      }
    }

    const type = event.type || event.event || '';
    const obj = event.data?.object || event;

    if (type === 'payment_intent.succeeded' || type === 'payment_intent.amount_capturable_updated') {
      await updateBookingFromPaymentIntent(obj, { paymentStatus: obj.status || 'requires_capture', depositHeld: true });
    }

    if (type === 'payment_intent.canceled') {
      await updateBookingFromPaymentIntent(obj, { paymentStatus: 'canceled', depositHeld: false });
    }

    if (type === 'charge.refunded') {
      const bookingId = obj?.metadata?.bookingId;
      if (bookingId) {
        const b = await Booking.findById(bookingId);
        if (b) {
          b.depositRefundedAt = new Date();
          b.depositCaptured = false;
          b.depositHeld = false;
          b.paymentStatus = 'canceled';
          await b.save();
        }
      }
    }

    res.json({ received: true });
  } catch (err) {
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
}

export default null;
