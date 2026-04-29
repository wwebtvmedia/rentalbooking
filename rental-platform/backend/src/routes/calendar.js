import express from "express";
import Booking from "../models/Booking.js";
import Availability from "../models/Availability.js";
import Apartment from "../models/Apartment.js";

const router = express.Router();

function publicApartment(apt) {
  if (!apt) return null;
  return { id: apt._id, name: apt.name, pricePerNight: apt.pricePerNight, photos: apt.photos, rules: apt.rules, lat: apt.lat, lon: apt.lon };
}

router.get("/events", async (req, res) => {
  try {
    const from = req.query.from ? new Date(req.query.from) : new Date(0);
    const to = req.query.to ? new Date(req.query.to) : new Date(8640000000000000);
    if (isNaN(from.getTime()) || isNaN(to.getTime()) || from >= to) return res.status(400).json({ error: 'Invalid date range' });

    const filter = { start: { $lt: to }, end: { $gt: from } };
    if (req.query.apartmentId) filter.apartmentId = req.query.apartmentId;

    const bookings = await Booking.find({ ...filter, status: "confirmed" });
    const avails = await Availability.find(filter);
    const apartmentIds = [...new Set([...bookings, ...avails].map(e => e.apartmentId).filter(Boolean))];
    const apartments = await Apartment.find({ _id: { $in: apartmentIds } });
    const apartmentMap = new Map(apartments.map(a => [a._id.toString(), a]));

    const events = [];
    let bookingIndex = 0;
    for (const b of bookings) {
      const apt = b.apartmentId ? apartmentMap.get(String(b.apartmentId)) : null;
      events.push({
        id: `booking_${bookingIndex++}`,
        title: 'Reserved',
        start: b.start,
        end: b.end,
        allDay: false,
        extendedProps: { type: "booking", apartment: publicApartment(apt) }
      });
    }

    let availabilityIndex = 0;
    for (const a of avails) {
      const apt = a.apartmentId ? apartmentMap.get(String(a.apartmentId)) : null;
      events.push({
        id: `availability_${availabilityIndex++}`,
        title: a.type === 'blocked' ? 'Blocked' : (a.note || 'Available'),
        start: a.start,
        end: a.end,
        allDay: false,
        backgroundColor: a.type === 'blocked' ? '#666' : '#2ecc71',
        borderColor: a.type === 'blocked' ? '#444' : '#27ae60',
        extendedProps: { type: 'availability', availType: a.type, apartment: publicApartment(apt) }
      });
    }

    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
