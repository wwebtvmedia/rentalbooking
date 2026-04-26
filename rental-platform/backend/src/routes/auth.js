import express from 'express';
import { authMiddleware, createToken } from '../auth/index.js';
import User from '../models/User.js';
import { v4 as uuidv4 } from 'uuid';
import MagicToken from '../models/MagicToken.js';
import { sendMagicLink } from '../auth/mailer.js';
import jwt from 'jsonwebtoken';

const router = express.Router();
router.use(authMiddleware);

router.get('/me', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  res.json(req.user);
});

// POST /auth/magic - request a magic sign-in link
router.post('/magic', async (req, res) => {
  try {
    let { email, redirectUrl, fullName } = req.body;
    if (!email) return res.status(400).json({ error: 'Missing email' });

    // Handle Profile Suffixes (e.g. user_host@example.com)
    let requestedRole = 'guest';
    if (email.includes('_host')) {
        requestedRole = 'host';
        email = email.replace('_host', '');
    } else if (email.includes('_concierge')) {
        requestedRole = 'concierge';
        email = email.replace('_concierge', '');
    } else if (email.includes('_contractor')) {
        requestedRole = 'contractor';
        email = email.replace('_contractor', '');
    }

    const jti = uuidv4();
    // We store the requested role in the token purpose or a new field
    const token = jwt.sign({ jti, email, requestedRole, purpose: 'magic' }, process.env.AUTH_JWT_SECRET || process.env.JWT_SECRET, { expiresIn: '15m' });

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await MagicToken.create({ jti, email, fullName, expiresAt });

    const callback = redirectUrl || (process.env.FRONTEND_ORIGIN || 'http://localhost:3000') + '/magic-callback';
    const link = `${callback}?token=${encodeURIComponent(token)}`;

    if (process.env.NODE_ENV === 'test') return res.json({ ok: true, token });

    await sendMagicLink(email, link);
    res.json({ ok: true, message: `Magic link sent for ${requestedRole} profile` });
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

    mt.used = true;
    await mt.save();

    let user = await User.findOne({ email: payload.email });
    if (!user) {
      const nameToUse = mt.fullName || 'New Member';
      user = await User.create({ 
        fullName: nameToUse, 
        email: payload.email, 
        roles: [payload.requestedRole || 'guest'] 
      });
    } else {
        // Add the role if they don't have it
        if (payload.requestedRole && !user.roles.includes(payload.requestedRole)) {
            user.roles.push(payload.requestedRole);
            await user.save();
        }
    }

    const sessionToken = createToken({ 
        id: user._id.toString(), 
        name: user.fullName, 
        email: user.email, 
        roles: user.roles 
    }, '14d');

    res.json({ token: sessionToken, user: { id: user._id, fullName: user.fullName, email: user.email, roles: user.roles } });
  } catch (err) {
    res.status(400).json({ error: 'Invalid or expired token' });
  }
});

export default router;
