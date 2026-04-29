import express from 'express';
import path from 'path';
import crypto from 'crypto';
import Media from '../models/Media.js';
import { authMiddleware, requireRole } from '../auth/index.js';

let multerAvailable = true;
let upload = null;
try {
  const multerPkg = await import('multer');
  const multer = multerPkg.default;
  const storage = multer.memoryStorage();
  upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024, files: 1 } });
} catch {
  multerAvailable = false;
}

const router = express.Router();

function detectImage(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  const hex = buffer.subarray(0, 12).toString('hex');
  const ascii = buffer.subarray(0, Math.min(buffer.length, 32)).toString('latin1');

  if (hex.startsWith('89504e470d0a1a0a')) return { contentType: 'image/png', ext: '.png' };
  if (hex.startsWith('ffd8ff')) return { contentType: 'image/jpeg', ext: '.jpg' };
  if (ascii.startsWith('RIFF') && ascii.substring(8, 12) === 'WEBP') return { contentType: 'image/webp', ext: '.webp' };
  if (ascii.includes('ftypavif') || ascii.includes('ftypavis')) return { contentType: 'image/avif', ext: '.avif' };
  return null;
}

function publicUploadUrl(req, filename) {
  const origin = process.env.BACKEND_ORIGIN || `${req.protocol}://${req.get('host')}`;
  return `${origin}/uploads/${filename}`;
}

router.get('/:filename', async (req, res) => {
  try {
    const filename = path.basename(req.params.filename || '');
    const media = await Media.findOne({ filename });
    if (!media) return res.status(404).send('Not found');

    res.set('Content-Type', media.contentType);
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.set('X-Content-Type-Options', 'nosniff');
    res.send(media.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authMiddleware, requireRole('admin'), async (req, res) => {
  if (req.is('application/json')) {
    const { b64 } = req.body || {};
    if (!b64) return res.status(400).json({ error: 'Missing b64' });

    try {
      const buf = Buffer.from(String(b64), 'base64');
      if (buf.length > 5 * 1024 * 1024) return res.status(413).json({ error: 'File too large' });
      const detected = detectImage(buf);
      if (!detected) return res.status(400).json({ error: 'Only PNG, JPEG, WEBP and AVIF images are allowed' });

      const newName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${detected.ext}`;
      await Media.create({ filename: newName, contentType: detected.contentType, data: buf });
      return res.json({ url: publicUploadUrl(req, newName), filename: newName });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (multerAvailable && upload) {
    return upload.single('file')(req, res, async (err) => {
      if (err) return res.status(400).json({ error: err.message });
      if (!req.file) return res.status(400).json({ error: 'No file' });

      const detected = detectImage(req.file.buffer);
      if (!detected) return res.status(400).json({ error: 'Only PNG, JPEG, WEBP and AVIF images are allowed' });

      const newName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${detected.ext}`;
      try {
        await Media.create({ filename: newName, contentType: detected.contentType, data: req.file.buffer });
        return res.json({ url: publicUploadUrl(req, newName), filename: newName });
      } catch (e) {
        return res.status(500).json({ error: e.message });
      }
    });
  }

  return res.status(400).json({ error: 'Upload method not supported' });
});

export default router;
