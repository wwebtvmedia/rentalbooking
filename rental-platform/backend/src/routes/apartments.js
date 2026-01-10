import express from 'express';
import Apartment from '../models/Apartment.js';
import { requireRole, authMiddleware } from '../auth/index.js';
import { geocodeAddress } from '../lib/geocoder.js';

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
    const photos = Array.isArray(req.body.photos) ? req.body.photos : (typeof req.body.photos === 'string' ? req.body.photos.split(',').map(s => s.trim()).filter(Boolean) : []);
    let lat = req.body.lat ? Number(req.body.lat) : undefined;
    let lon = req.body.lon ? Number(req.body.lon) : undefined;
    const address = req.body.address || '';

    // if lat/lon missing and address provided, try geocoding
    if ((lat === undefined || lon === undefined) && address) {
      const g = await geocodeAddress(address);
      if (g) {
        lat = lat === undefined ? g.lat : lat;
        lon = lon === undefined ? g.lon : lon;
      }
    }

    const payload = {
      name: req.body.name,
      description: req.body.description || '',
      smallDescription: req.body.smallDescription || '',
      address,
      photos,
      pricePerNight: Number(req.body.pricePerNight || 0),
      rules: req.body.rules || '',
      lat,
      lon,
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
    apt.smallDescription = req.body.smallDescription ?? apt.smallDescription;

    // handle photos
    apt.photos = Array.isArray(req.body.photos) ? req.body.photos : (typeof req.body.photos === 'string' ? req.body.photos.split(',').map(s => s.trim()).filter(Boolean) : apt.photos);

    apt.pricePerNight = req.body.pricePerNight !== undefined ? Number(req.body.pricePerNight) : apt.pricePerNight;
    apt.rules = req.body.rules ?? apt.rules;

    // address updates: if address changed and no lat/lon provided, attempt geocode
    const newAddress = req.body.address !== undefined ? req.body.address : apt.address;
    const latProvided = req.body.lat !== undefined;
    const lonProvided = req.body.lon !== undefined;

    apt.address = newAddress;

    if (!latProvided && !lonProvided && newAddress) {
      // try geocode (async)
      const g = await geocodeAddress(newAddress);
      if (g) {
        apt.lat = g.lat;
        apt.lon = g.lon;
      }
    } else {
      apt.lat = latProvided ? Number(req.body.lat) : apt.lat;
      apt.lon = lonProvided ? Number(req.body.lon) : apt.lon;
    }

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