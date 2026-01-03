import express from "express";
import Booking from "../models/Booking.js";
import Availability from "../models/Availability.js";

const router = express.Router();

// GET /calendar/events?from=&to=
router.get("/events", async (req, res) => {
  try {
    const from = req.query.from ? new Date(req.query.from) : new Date(0);
    const to = req.query.to ? new Date(req.query.to) : new Date(8640000000000000);

    const filter = { start: { $lt: to }, end: { $gt: from } };
    if (req.query.apartmentId) filter.apartmentId = req.query.apartmentId;

    const bookings = await Booking.find({ ...filter, status: "confirmed" });
    const avails = await Availability.find(filter);

    const events = [];

    for (const b of bookings) {
      events.push({
        id: `booking_${b._id}`,
        title: `Booking: ${b.fullName}`,
        start: b.start,
        end: b.end,
        allDay: false,
        extendedProps: { type: "booking", bookingId: b._id }
      });
    }

    for (const a of avails) {
      events.push({
        id: `avail_${a._id}`,
        title: a.type === 'blocked' ? (a.note || 'Blocked') : (a.note || 'Available'),
        start: a.start,
        end: a.end,
        allDay: false,
        backgroundColor: a.type === 'blocked' ? '#666' : '#2ecc71',
        borderColor: a.type === 'blocked' ? '#444' : '#27ae60',
        extendedProps: { type: 'availability', availId: a._id, availType: a.type }
      });
    }

    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
