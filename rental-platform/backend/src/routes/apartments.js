import express from 'express';
import mongoose from 'mongoose';
import Apartment from '../models/Apartment.js';
import { requireRole, authMiddleware } from '../auth/index.js';
import { geocodeAddress } from '../lib/geocoder.js';
import { validate, apartmentSchema } from '../lib/validation.js';

const router = express.Router();
router.use(authMiddleware);

function photosFromBody(photos) {
  if (Array.isArray(photos)) return photos.map(String).map(s => s.trim()).filter(Boolean);
  if (typeof photos === 'string') return photos.split(',').map(s => s.trim()).filter(Boolean);
  return [];
}

function amountDollarsToCents(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.round(n * 100);
}

function optionalObjectId(value) {
  return value && mongoose.Types.ObjectId.isValid(value) ? value : undefined;
}

async function buildPayload(body, existing = {}) {
  const photos = body.photos !== undefined ? photosFromBody(body.photos) : existing.photos;
  let lat = body.lat !== undefined && body.lat !== '' ? Number(body.lat) : existing.lat;
  let lon = body.lon !== undefined && body.lon !== '' ? Number(body.lon) : existing.lon;
  const address = body.address !== undefined ? body.address : (existing.address || '');

  if ((lat === undefined || lon === undefined) && address) {
    const g = await geocodeAddress(address);
    if (g) {
      lat = lat === undefined ? g.lat : lat;
      lon = lon === undefined ? g.lon : lon;
    }
  }

  const payload = {
    name: body.name ?? existing.name,
    description: body.description ?? existing.description ?? '',
    smallDescription: body.smallDescription ?? existing.smallDescription ?? '',
    address,
    photos,
    pricePerNight: body.pricePerNight !== undefined ? Number(body.pricePerNight || 0) : existing.pricePerNight,
    rules: body.rules ?? existing.rules ?? '',
    lat,
    lon,
    ethAddress: body.ethAddress !== undefined ? (body.ethAddress || undefined) : existing.ethAddress,
    hostId: body.hostId !== undefined ? optionalObjectId(body.hostId) : existing.hostId,
    assignedConciergeId: body.assignedConciergeId !== undefined ? optionalObjectId(body.assignedConciergeId) : existing.assignedConciergeId,
  };

  if (body.depositAmount !== undefined) payload.depositAmount = amountDollarsToCents(body.depositAmount);
  else if (existing.depositAmount !== undefined) payload.depositAmount = existing.depositAmount;

  return payload;
}

router.get('/', async (req, res) => {
  try {
    const list = await Apartment.find().sort({ name: 1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let apt = mongoose.Types.ObjectId.isValid(id) ? await Apartment.findById(id) : null;
    if (!apt) apt = await Apartment.findOne({ slug: id });
    if (!apt) return res.status(404).json({ error: 'Residence not found in database' });
    res.json(apt);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireRole('admin'), validate(apartmentSchema), async (req, res) => {
  try {
    const payload = await buildPayload(req.body);
    const apt = await Apartment.create(payload);
    res.status(201).json(apt);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', requireRole('admin'), validate(apartmentSchema), async (req, res) => {
  try {
    const apt = await Apartment.findById(req.params.id);
    if (!apt) return res.status(404).json({ error: 'Not found' });
    Object.assign(apt, await buildPayload(req.body, apt));
    await apt.save();
    res.json(apt);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
