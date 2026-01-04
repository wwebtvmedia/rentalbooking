import express from 'express';
import Apartment from '../models/Apartment.js';
import { requireRole, authMiddleware } from '../auth/index.js';

const router = express.Router();
// ensure auth middleware runs so requireRole can read req.user
router.use(authMiddleware);


// GET /apartments - list
router.get('/', async (req, res) => {
  try {
    const list = await Apartment.find().sort({ name: 1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /apartments/:id
router.get('/:id', async (req, res) => {
  try {
    const apt = await Apartment.findById(req.params.id);
    if (!apt) return res.status(404).json({ error: 'Not found' });
    res.json(apt);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /apartments - admin only
router.post('/', requireRole('admin'), async (req, res) => {
  try {
    const payload = {
      name: req.body.name,
      description: req.body.description || '',
      photos: Array.isArray(req.body.photos) ? req.body.photos : (typeof req.body.photos === 'string' ? req.body.photos.split(',').map(s => s.trim()).filter(Boolean) : []),
      pricePerNight: Number(req.body.pricePerNight || 0),
      rules: req.body.rules || '',
      lat: req.body.lat ? Number(req.body.lat) : undefined,
      lon: req.body.lon ? Number(req.body.lon) : undefined,
      // depositAmount provided by admin in dollars (e.g., 100), store in cents for precision
      depositAmount: req.body.depositAmount !== undefined ? Math.round(Number(req.body.depositAmount) * 100) : undefined
    };
    const apt = await Apartment.create(payload);
    res.status(201).json(apt);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /apartments/:id - admin only
router.put('/:id', requireRole('admin'), async (req, res) => {
  try {
    const apt = await Apartment.findById(req.params.id);
    if (!apt) return res.status(404).json({ error: 'Not found' });
    apt.name = req.body.name ?? apt.name;
    apt.description = req.body.description ?? apt.description;
    apt.photos = Array.isArray(req.body.photos) ? req.body.photos : (typeof req.body.photos === 'string' ? req.body.photos.split(',').map(s => s.trim()).filter(Boolean) : apt.photos);
    apt.pricePerNight = req.body.pricePerNight !== undefined ? Number(req.body.pricePerNight) : apt.pricePerNight;
    apt.rules = req.body.rules ?? apt.rules;
    apt.lat = req.body.lat !== undefined ? Number(req.body.lat) : apt.lat;
    apt.lon = req.body.lon !== undefined ? Number(req.body.lon) : apt.lon;
    apt.depositAmount = req.body.depositAmount !== undefined ? Math.round(Number(req.body.depositAmount) * 100) : apt.depositAmount;
    await apt.save();
    res.json(apt);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /apartments/:id - admin only
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    const apt = await Apartment.findById(req.params.id);
    if (!apt) return res.status(404).json({ error: 'Not found' });
    await apt.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;