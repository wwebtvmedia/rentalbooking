import express from 'express';
import path from 'path';
import fs from 'fs';

let multerAvailable = true;
let upload = null;
try {
  // try to import multer; if not installed, fall back to JSON base64 upload support
  // eslint-disable-next-line import/no-extraneous-dependencies
  const multerPkg = await import('multer');
  const multer = multerPkg.default;

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || '';
      const base = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, base + ext);
    }
  });

  function fileFilter(req, file, cb) {
    // allow common image types
    if (/^image\//.test(file.mimetype)) return cb(null, true);
    cb(new Error('Only image files allowed'));
  }

  upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
} catch (err) {
  multerAvailable = false;
}

const router = express.Router();

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// POST /uploads - accepts multipart form-data file='file' OR JSON { filename, b64 }
router.post('/', async (req, res, next) => {
  if (multerAvailable && upload) {
    return upload.single('file')(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message });
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      const origin = process.env.BACKEND_ORIGIN || `${req.protocol}://${req.get('host')}`;
      const url = `${origin}/uploads/${req.file.filename}`;
      return res.json({ url, filename: req.file.filename });
    });
  }

  // fallback: accept JSON body with base64 'b64' and 'filename'
  if (!req.is('application/json')) return res.status(400).json({ error: 'Multipart upload not available and no JSON body provided' });
  const { b64, filename } = req.body || {};
  if (!b64 || !filename) return res.status(400).json({ error: 'Missing b64 or filename in JSON body' });
  try {
    const buf = Buffer.from(b64, 'base64');
    const ext = path.extname(filename) || '.bin';
    const newName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    const outPath = path.join(uploadDir, newName);
    await fs.promises.writeFile(outPath, buf);
    const origin = process.env.BACKEND_ORIGIN || `${req.protocol}://${req.get('host')}`;
    const url = `${origin}/uploads/${newName}`;
    return res.json({ url, filename: newName });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;