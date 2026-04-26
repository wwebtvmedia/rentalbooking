import jwt from 'jsonwebtoken';
import { verifyGoogleToken } from './googleAuth.js';

/**
 * Enhanced Middleware: Supports Internal JWT and Google-Compatible OIDC Tokens
 */
export async function authMiddleware(req, res, next) {
  const auth = req.headers.authorization || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    req.user = null;
    return next();
  }
  
  const token = match[1];
  const secret = process.env.AUTH_JWT_SECRET || process.env.JWT_SECRET;

  // 1. Try Internal JWT Verification
  try {
    const payload = jwt.verify(token, secret);
    req.user = {
      id: payload.sub || payload.id,
      name: payload.name,
      email: payload.email,
      roles: Array.isArray(payload.roles) ? payload.roles : (payload.role ? [payload.role] : [])
    };
    return next();
  } catch (err) {
    // If not a valid internal JWT, proceed to try Google OIDC
  }

  // 2. Try Google OIDC Verification (Recommended for External Agents)
  if (process.env.GOOGLE_CLIENT_ID) {
    const googleUser = await verifyGoogleToken(token);
    if (googleUser) {
        req.user = googleUser;
        return next();
    }
  }

  req.user = null;
  next();
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    // 'verified_agent' is a virtual role granted to valid Google Tokens
    if (Array.isArray(req.user.roles) && (req.user.roles.includes(role) || req.user.roles.includes('verified_agent'))) {
      return next();
    }
    return res.status(403).json({ error: 'Forbidden' });
  };
}

export function createToken({ id, name, email, roles = [] }, expiresIn = '7d') {
  const secret = process.env.AUTH_JWT_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error('AUTH_JWT_SECRET or JWT_SECRET not set');
  const payload = { sub: id, name, email, roles };
  return jwt.sign(payload, secret, { expiresIn });
}
