import express from 'express';
import Booking from '../models/Booking.js';

let stripe;
try {
  stripe = (await import('stripe')).default(process.env.STRIPE_SECRET_KEY);
} catch (e) {
  stripe = null;
}

// Export a single handler function that expects a raw body (so index.js can mount express.raw)
export async function stripeWebhookHandler(req, res) {
  const sig = req.headers['stripe-signature'];
  try {
    let event;
    if (stripe && process.env.STRIPE_WEBHOOK_SECRET && sig) {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } else {
      // fallback: parse JSON body
      // req.body may be a Buffer when raw; try to parse JSON
      try {
        event = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body && req.body.length ? JSON.parse(req.body.toString()) : req.body);
      } catch (e) {
        event = req.body;
      }
    }

    const type = event.type || event.event || '';
    const obj = event.data && event.data.object ? event.data.object : event;

    if (type === 'payment_intent.succeeded') {
      const bookingId = obj.metadata && obj.metadata.bookingId;
      if (bookingId) {
        const b = await Booking.findById(bookingId);
        if (b) {
          b.paymentStatus = 'succeeded';
          b.depositHeld = true;
          await b.save();
        }
      }
    }

    if (type === 'payment_intent.canceled') {
      const bookingId = obj.metadata && obj.metadata.bookingId;
      if (bookingId) {
        const b = await Booking.findById(bookingId);
        if (b) {
          b.paymentStatus = 'canceled';
          b.depositHeld = false;
          await b.save();
        }
      }
    }

    if (type === 'charge.refunded') {
      // Charge may include metadata
      const bookingId = obj.metadata && obj.metadata.bookingId;
      if (bookingId) {
        const b = await Booking.findById(bookingId);
        if (b) {
          b.depositRefundedAt = new Date();
          b.depositCaptured = false;
          await b.save();
        }
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook handling error', err);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
}

export default null;
