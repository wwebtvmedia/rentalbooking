import express from 'express';
import { authMiddleware, createToken } from '../auth/index.js';
import Customer from '../models/Customer.js';

const router = express.Router();
router.use(authMiddleware);

router.get('/me', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  res.json(req.user);
});

// POST /auth/login - passwordless: provide { email } (and optional name to create account)
router.post('/login', async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email) return res.status(400).json({ error: 'Missing email' });
    let customer = await Customer.findOne({ email });
    if (!customer) {
      if (!name) return res.status(404).json({ error: 'No such user; provide name to create' });
      customer = await Customer.create({ fullName: name, email });
    }
    // create a token for the customer (no roles by default)
    const token = createToken({ id: customer._id.toString(), name: customer.fullName, email: customer.email, roles: [] }, '14d');
    res.json({ token, user: { id: customer._id, fullName: customer.fullName, email: customer.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /auth/magic - request a magic sign-in link
import { v4 as uuidv4 } from 'uuid';
import MagicToken from '../models/MagicToken.js';
import { sendMagicLink } from '../auth/mailer.js';
import jwt from 'jsonwebtoken';

router.post('/magic', async (req, res) => {
  try {
    const { email, redirectUrl } = req.body;
    if (!email) return res.status(400).json({ error: 'Missing email' });

    // ensure user exists (create if missing)
    let user = await Customer.findOne({ email });
    if (!user) user = await Customer.create({ fullName: 'Guest', email });

    const jti = uuidv4();
    const token = jwt.sign({ jti, email, purpose: 'magic' }, process.env.AUTH_JWT_SECRET || process.env.JWT_SECRET, { expiresIn: '15m' });

    // store jti to prevent replay
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await MagicToken.create({ jti, email, expiresAt });

    const callback = redirectUrl || (process.env.FRONTEND_ORIGIN || 'http://localhost:3000') + '/magic-callback';
    const link = `${callback}?token=${encodeURIComponent(token)}`;

    // send link
    if (process.env.NODE_ENV === 'test') {
      // in tests, return the token for convenience
      return res.json({ ok: true, token });
    }

    await sendMagicLink(email, link);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /auth/magic/verify - exchange magic token for session token
router.post('/magic/verify', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Missing token' });
    const secret = process.env.AUTH_JWT_SECRET || process.env.JWT_SECRET;
    const payload = jwt.verify(token, secret);
    if (payload.purpose !== 'magic' || !payload.jti) return res.status(400).json({ error: 'Invalid token' });

    const mt = await MagicToken.findOne({ jti: payload.jti });
    if (!mt || mt.used) return res.status(400).json({ error: 'Token used or expired' });

    // mark used
    mt.used = true;
    await mt.save();

    // find or create user
    let user = await Customer.findOne({ email: payload.email });
    if (!user) user = await Customer.create({ fullName: 'Guest', email: payload.email });

    // issue a session token
    const sessionToken = createToken({ id: user._id.toString(), name: user.fullName, email: user.email, roles: [] }, '14d');
    res.json({ token: sessionToken, user: { id: user._id, fullName: user.fullName, email: user.email } });
  } catch (err) {
    res.status(400).json({ error: 'Invalid or expired token' });
  }
});

export default router;
