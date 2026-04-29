import express from 'express';
import { logger } from '../logger.js';
import { authMiddleware, createToken } from '../auth/index.js';
import User from '../models/User.js';
import { v4 as uuidv4 } from 'uuid';
import MagicToken from '../models/MagicToken.js';
import { sendMagicLink } from '../auth/mailer.js';
import jwt from 'jsonwebtoken';
import { encrypt, decrypt, generateUserKey, blindIndex, protectKey, unprotectKey, normalizeEmail, safeEqual } from '../lib/encryption.js';

const router = express.Router();
router.use(authMiddleware);

const PUBLIC_ROLES = new Set(['guest', 'host', 'concierge', 'contractor']);
const STAFF_ROLE_ENV = {
  host: 'HOST_INVITE_CODE',
  concierge: 'CONCIERGE_INVITE_CODE',
  contractor: 'CONTRACTOR_INVITE_CODE'
};

function configuredFrontendOrigins() {
  return (process.env.FRONTEND_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function isAllowedOrigin(origin) {
  if (configuredFrontendOrigins().includes(origin)) return true;
  if (process.env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  return /^https:\/\/([a-z0-9-]+\.)?bestflats\.vip$/i.test(origin);
}

function callbackUrlFromRequest(redirectUrl) {
  const fallback = new URL('/magic-callback', configuredFrontendOrigins()[0]).toString();
  const candidate = new URL(redirectUrl || fallback);
  if (!isAllowedOrigin(candidate.origin)) {
    const error = new Error('Invalid redirect URL');
    error.status = 400;
    throw error;
  }
  candidate.pathname = '/magic-callback';
  candidate.search = '';
  candidate.hash = '';
  return candidate.toString();
}

function resolveRequestedRole(role, inviteCode) {
  const requested = PUBLIC_ROLES.has(role) ? role : 'guest';
  if (requested === 'guest') return requested;

  if (process.env.NODE_ENV !== 'production' && process.env.ALLOW_DEV_ROLE_MAGIC_LINKS !== 'false') {
    return requested;
  }

  const envName = STAFF_ROLE_ENV[requested];
  const expected = envName ? process.env[envName] : '';
  if (expected && inviteCode && safeEqual(inviteCode, expected)) return requested;

  const error = new Error(`${requested} access requires a valid invite code`);
  error.status = 403;
  throw error;
}

async function findOrCreateUser({ email, fullName, role }) {
  const normalizedEmail = normalizeEmail(email);
  const emailHash = blindIndex(normalizedEmail);
  let user = await User.findOne({ emailHash, role });

  if (!user) {
    const userKey = generateUserKey();
    user = await User.create({
      fullName: encrypt(fullName || 'New Member', userKey),
      email: encrypt(normalizedEmail, userKey),
      emailHash,
      role,
      userKey: protectKey(userKey)
    });
  }

  const realUserKey = unprotectKey(user.userKey);
  return {
    user,
    fullName: decrypt(user.fullName, realUserKey),
    email: decrypt(user.email, realUserKey)
  };
}

router.get('/me', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  res.json(req.user);
});

// Development-only helper. Production must use magic links or an external IdP.
router.post('/login', async (req, res) => {
  if (process.env.NODE_ENV === 'production') return res.status(404).json({ error: 'Not found' });

  try {
    const email = normalizeEmail(req.body?.email);
    const name = String(req.body?.name || 'New Guest').trim();
    if (!email) return res.status(400).json({ error: 'Missing email' });

    const { user, fullName, email: userEmail } = await findOrCreateUser({ email, fullName: name, role: 'guest' });
    const token = createToken({ id: user._id.toString(), name: fullName, email: userEmail, roles: [user.role] });

    res.json({ token, user: { id: user._id, fullName, email: userEmail, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/magic', async (req, res) => {
  const forensicId = Math.random().toString(36).substring(7);
  try {
    const email = normalizeEmail(req.body?.email);
    const fullName = String(req.body?.fullName || '').trim();
    const callback = callbackUrlFromRequest(req.body?.redirectUrl);
    const requestedRole = resolveRequestedRole(req.body?.role || 'guest', req.body?.inviteCode);

    if (!email) return res.status(400).json({ error: 'Missing email' });

    const emailHash = blindIndex(email);
    logger.info({ forensicId, emailHash, role: requestedRole }, 'AUTH_MAGIC_REQUEST: Initiated');

    const secret = process.env.AUTH_JWT_SECRET || process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: 'AUTH_JWT_SECRET or JWT_SECRET not set' });

    const jti = uuidv4();
    const token = jwt.sign({ jti, email, requestedRole, purpose: 'magic' }, secret, { expiresIn: '15m' });
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await MagicToken.create({ jti, emailHash, fullName, requestedRole, redirectOrigin: new URL(callback).origin, expiresAt });

    const link = `${callback}?token=${encodeURIComponent(token)}`;

    if (process.env.NODE_ENV === 'test') {
      logger.info({ forensicId, emailHash }, 'AUTH_MAGIC_REQUEST: Completed (test mode)');
      return res.json({ ok: true, token });
    }

    if (process.env.AUTH_LOG_EMAIL_TOKEN === 'true' && process.env.NODE_ENV !== 'production') {
      logger.info({ forensicId, emailHash, token }, 'AUTH_MAGIC_DEBUG: Token generated');
    }

    await sendMagicLink(email, link);
    logger.info({ forensicId, emailHash }, 'AUTH_MAGIC_REQUEST: Link sent successfully');
    res.json({ ok: true, message: `Magic link sent for ${requestedRole} profile` });
  } catch (err) {
    logger.error({ forensicId, err: err.message }, 'AUTH_MAGIC_REQUEST: Failed');
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.post('/magic/verify', async (req, res) => {
  const forensicId = Math.random().toString(36).substring(7);
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Missing token' });

    const secret = process.env.AUTH_JWT_SECRET || process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: 'AUTH_JWT_SECRET or JWT_SECRET not set' });

    const payload = jwt.verify(token, secret);
    if (payload.purpose !== 'magic' || !payload.jti || !payload.email) {
      return res.status(400).json({ error: 'Invalid token' });
    }

    const mt = await MagicToken.findOne({ jti: payload.jti });
    if (!mt || mt.used) return res.status(400).json({ error: 'Token used or expired' });

    const email = normalizeEmail(payload.email);
    if (mt.emailHash !== blindIndex(email)) return res.status(400).json({ error: 'Invalid token' });

    mt.used = true;
    await mt.save();

    const roleToUse = PUBLIC_ROLES.has(payload.requestedRole) ? payload.requestedRole : 'guest';
    const { user, fullName, email: userEmail } = await findOrCreateUser({ email, fullName: mt.fullName, role: roleToUse });

    const sessionToken = createToken({ id: user._id.toString(), name: fullName, email: userEmail, roles: [user.role] }, '14d');
    logger.info({ forensicId, userId: user._id, role: user.role }, 'AUTH_VERIFY_REQUEST: Successful login');

    res.json({ token: sessionToken, user: { id: user._id, fullName, email: userEmail, role: user.role } });
  } catch (err) {
    logger.error({ forensicId, err: err.message }, 'AUTH_VERIFY_REQUEST: Error');
    res.status(400).json({ error: 'Invalid or expired token' });
  }
});

export default router;
