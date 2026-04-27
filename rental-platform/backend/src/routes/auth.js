import express from 'express';
import { logger } from '../logger.js';
import { authMiddleware, createToken } from '../auth/index.js';
import User from '../models/User.js';
import { v4 as uuidv4 } from 'uuid';
import MagicToken from '../models/MagicToken.js';
import { sendMagicLink } from '../auth/mailer.js';
import jwt from 'jsonwebtoken';
import { encrypt, decrypt, generateUserKey, blindIndex } from '../lib/encryption.js';

const router = express.Router();
router.use(authMiddleware);

router.get('/me', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  res.json(req.user);
});

// POST /auth/login - passwordless login (email only for demo/test)
router.post('/login', async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email) return res.status(400).json({ error: 'Missing email' });

    const emailHash = blindIndex(email);
    let user = await User.findOne({ emailHash, role: 'guest' });

    if (!user) {
      const userKey = generateUserKey();
      const nameToUse = name || 'New Guest';
      user = await User.create({
        fullName: encrypt(nameToUse, userKey),
        email: encrypt(email, userKey),
        emailHash,
        role: 'guest',
        userKey
      });
    }

    const fullName = decrypt(user.fullName, user.userKey);
    const userEmail = decrypt(user.email, user.userKey);

    const token = createToken({
      id: user._id.toString(),
      name: fullName,
      email: userEmail,
      roles: [user.role]
    });

    res.json({
      token,
      user: { id: user._id, fullName, email: userEmail, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /auth/magic - request a magic sign-in link
router.post('/magic', async (req, res) => {
  const forensicId = Math.random().toString(36).substring(7);
  try {
    let { email, redirectUrl, fullName, role } = req.body;
    logger.info({ forensicId, email, role }, 'AUTH_MAGIC_REQUEST: Initiated');

    if (!email) return res.status(400).json({ error: 'Missing email' });

    const requestedRole = role || 'guest';
    const jti = uuidv4();
    const token = jwt.sign({ jti, email, requestedRole, purpose: 'magic' }, process.env.AUTH_JWT_SECRET || process.env.JWT_SECRET, { expiresIn: '15m' });

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await MagicToken.create({ jti, email, fullName, expiresAt });

    const callback = redirectUrl || (process.env.FRONTEND_ORIGIN || 'http://localhost:3000') + '/magic-callback';
    const link = `${callback}?token=${encodeURIComponent(token)}`;

    if (process.env.NODE_ENV === 'test') {
      logger.info({ forensicId, email }, 'AUTH_MAGIC_REQUEST: Completed (test mode)');
      return res.json({ ok: true, token });
    }

    if (process.env.AUTH_LOG_EMAIL_TOKEN === 'true') {
        logger.info({ forensicId, email, token }, 'AUTH_MAGIC_DEBUG: Token generated');
    }

    await sendMagicLink(email, link);
    logger.info({ forensicId, email }, 'AUTH_MAGIC_REQUEST: Link sent successfully');
    res.json({ ok: true, message: `Magic link sent for ${requestedRole} profile` });
  } catch (err) {
    logger.error({ forensicId, err: err.message }, 'AUTH_MAGIC_REQUEST: Failed');
    res.status(500).json({ error: err.message });
  }
});

// POST /auth/magic/verify - exchange magic token for session token
router.post('/magic/verify', async (req, res) => {
  const forensicId = Math.random().toString(36).substring(7);
  try {
    const { token } = req.body;
    logger.info({ forensicId }, 'AUTH_VERIFY_REQUEST: Initiated');

    if (!token) return res.status(400).json({ error: 'Missing token' });
    const secret = process.env.AUTH_JWT_SECRET || process.env.JWT_SECRET;
    const payload = jwt.verify(token, secret);
    
    if (payload.purpose !== 'magic' || !payload.jti) {
        logger.warn({ forensicId }, 'AUTH_VERIFY_REQUEST: Invalid token purpose or jti');
        return res.status(400).json({ error: 'Invalid token' });
    }

    const mt = await MagicToken.findOne({ jti: payload.jti });
    if (!mt || mt.used) {
        logger.warn({ forensicId, jti: payload.jti }, 'AUTH_VERIFY_REQUEST: Token used or not found');
        return res.status(400).json({ error: 'Token used or expired' });
    }

    mt.used = true;
    await mt.save();

    const roleToUse = payload.requestedRole || 'guest';
    const emailHash = blindIndex(payload.email);
    
    let user = await User.findOne({ emailHash, role: roleToUse });
    
    if (!user) {
      logger.info({ forensicId, role: roleToUse }, 'AUTH_VERIFY_REQUEST: Creating new user');
      const userKey = generateUserKey();
      const nameToUse = mt.fullName || 'New Member';
      
      user = await User.create({ 
        fullName: encrypt(nameToUse, userKey), 
        email: encrypt(payload.email, userKey),
        emailHash,
        role: roleToUse,
        userKey
      });
    }

    // Decrypt details for the frontend response
    const fullName = decrypt(user.fullName, user.userKey);
    const email = decrypt(user.email, user.userKey);

    const sessionToken = createToken({ 
        id: user._id.toString(), 
        name: fullName, 
        email: email, 
        roles: [user.role]
    }, '14d');

    logger.info({ forensicId, userId: user._id, role: user.role }, 'AUTH_VERIFY_REQUEST: Successful login');

    res.json({ 
        token: sessionToken, 
        user: { id: user._id, fullName, email, role: user.role } 
    });
  } catch (err) {
    logger.error({ forensicId, err: err.message }, 'AUTH_VERIFY_REQUEST: Error');
    res.status(400).json({ error: 'Invalid or expired token' });
  }
});

export default router;
