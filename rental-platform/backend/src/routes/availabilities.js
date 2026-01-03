import express from "express";
import Availability from "../models/Availability.js";
import { authMiddleware, requireRole } from "../auth/index.js";

const router = express.Router();

// Attach auth middleware so we can protect certain operations
router.use(authMiddleware);

// GET /availabilities?from=&to=
router.get("/", async (req, res) => {
  try {
    const q = {};
    if (req.query.apartmentId) q.apartmentId = req.query.apartmentId;
    if (req.query.from || req.query.to) {
      q.$or = [];
      const from = req.query.from ? new Date(req.query.from) : new Date(0);
      const to = req.query.to ? new Date(req.query.to) : new Date(8640000000000000);
      q.$or.push({ start: { $lt: to }, end: { $gt: from } });
    }
    const list = await Availability.find(q).sort({ start: 1 }).limit(1000);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /availabilities - create a blocking or availability slot (admin only)
router.post("/", requireRole('admin'), async (req, res) => {
  try {
    const { start, end, type, note, apartmentId } = req.body;
    if (!start || !end) return res.status(400).json({ error: 'Missing start/end' });
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s) || isNaN(e) || s >= e) return res.status(400).json({ error: 'Invalid range' });
    const slot = await Availability.create({ start: s, end: e, type: type || 'blocked', note, apartmentId });
    res.status(201).json(slot);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /availabilities/:id (admin only)
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    await Availability.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
