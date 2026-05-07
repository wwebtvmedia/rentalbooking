import express from 'express';
import path from 'path';
import fs from 'fs';
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
    
    // 1. Try to find in MongoDB
    const media = await Media.findOne({ filename });
    if (media) {
      res.set('Content-Type', media.contentType);
      res.set('Cache-Control', 'public, max-age=31536000, immutable');
      res.set('X-Content-Type-Options', 'nosniff');
      res.set('Cross-Origin-Resource-Policy', 'cross-origin');
      return res.send(media.data);
    }

    // 2. Fallback: Try to find on filesystem (e.g. for development or if seed not run)
    const possiblePaths = [
      path.join(process.cwd(), 'uploads', filename),
      path.join(process.cwd(), 'uploads/appartement', filename),
    ];
    
    // Handle cases where frontend might have prefixed the name or added spaces
    const decodedFilename = decodeURIComponent(filename);
    if (decodedFilename !== filename) {
        possiblePaths.push(path.join(process.cwd(), 'uploads/appartement', decodedFilename));
    }

    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        const ext = path.extname(filePath).toLowerCase();
        let contentType = 'application/octet-stream';
        if (ext === '.avif') contentType = 'image/avif';
        else if (ext === '.webp') contentType = 'image/webp';
        else if (ext === '.png') contentType = 'image/png';
        else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
        else if (ext === '.svg') contentType = 'image/svg+xml';

        res.set('Content-Type', contentType);
        res.set('Cache-Control', 'public, max-age=31536000, immutable');
        res.set('X-Content-Type-Options', 'nosniff');
        res.set('Cross-Origin-Resource-Policy', 'cross-origin');
        return res.sendFile(path.resolve(filePath));
      }
    }

    // 3. Last resort: Return a 404 but as a proper image or at least non-blocked response
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.status(404).send('Resource not found');
  } catch (err) {
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
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
