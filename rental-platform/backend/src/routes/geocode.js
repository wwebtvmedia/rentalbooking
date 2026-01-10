import express from 'express';
const router = express.Router();

// GET /geocode?address=...
// Proxies a simple lookup to the configured geocoder. Returns { ok, lat, lon, display_name }
import { geocodeAddress } from '../lib/geocoder.js';

router.get('/', async (req, res) => {
  try {
    const address = String(req.query.address || '');
    if (!address) return res.status(400).json({ error: 'Missing address' });

    const g = await geocodeAddress(address);
    if (!g) return res.json({ ok: false });
    return res.json({ ok: true, lat: g.lat, lon: g.lon, display_name: g.display_name });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
