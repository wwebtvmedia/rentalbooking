import express from 'express';
import path from 'path';
import Media from '../models/Media.js';

let multerAvailable = true;
let upload = null;
try {
  const multerPkg = await import('multer');
  const multer = multerPkg.default;
  // Use memory storage since we are saving to DB
  const storage = multer.memoryStorage();

  function fileFilter(req, file, cb) {
    if (/^image\//.test(file.mimetype)) return cb(null, true);
    cb(new Error('Only image files allowed'));
  }

  upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
} catch (err) {
  multerAvailable = false;
}

const router = express.Router();

// GET /uploads/:filename - Serve from DB
router.get('/:filename', async (req, res) => {
  try {
    const media = await Media.findOne({ filename: req.params.filename });
    if (!media) return res.status(404).send('Not found');

    res.set('Content-Type', media.contentType);
    res.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    res.set('Access-Control-Allow-Origin', '*');
    res.send(media.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /uploads - Store in DB
router.post('/', async (req, res) => {
  if (req.is('application/json')) {
    const { b64, filename } = req.body || {};
    if (!b64 || !filename) return res.status(400).json({ error: 'Missing b64 or filename' });
    
    const ext = path.extname(filename).toLowerCase();
    const newName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    
    try {
      const buf = Buffer.from(b64, 'base64');
      await Media.create({
        filename: newName,
        contentType: `image/${ext.replace('.', '')}`,
        data: buf
      });

      const origin = process.env.BACKEND_ORIGIN || `${req.protocol}://${req.get('host')}`;
      return res.json({ url: `${origin}/uploads/${newName}`, filename: newName });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (multerAvailable && upload) {
    return upload.single('file')(req, res, async (err) => {
      if (err) return res.status(400).json({ error: err.message });
      if (!req.file) return res.status(400).json({ error: 'No file' });

      const newName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(req.file.originalname)}`;
      
      try {
        await Media.create({
          filename: newName,
          contentType: req.file.mimetype,
          data: req.file.buffer
        });

        const origin = process.env.BACKEND_ORIGIN || `${req.protocol}://${req.get('host')}`;
        return res.json({ url: `${origin}/uploads/${newName}`, filename: newName });
      } catch (e) {
        return res.status(500).json({ error: e.message });
      }
    });
  }

  return res.status(400).json({ error: 'Upload method not supported' });
});

export default router;