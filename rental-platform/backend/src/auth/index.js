import jwt from 'jsonwebtoken';

// Verify bearer JWT and attach `req.user` with { id, name, email, roles }
export function authMiddleware(req, res, next) {
  const auth = req.headers.authorization || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    req.user = null;
    return next();
  }
  const token = match[1];
  const secret = process.env.AUTH_JWT_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    // No secret configured — for safety, reject authenticated requests
    req.user = null;
    return next();
  }
  try {
    const payload = jwt.verify(token, secret);
    // Expect payload to include sub (id), name, email, roles (array)
    req.user = {
      id: payload.sub || payload.id,
      name: payload.name,
      email: payload.email,
      roles: Array.isArray(payload.roles) ? payload.roles : (payload.role ? [payload.role] : [])
    };
  } catch (err) {
    req.user = null;
  }
  next();
}

export function requireRole(role) {
  return (req, res, next) => {
    if (req.user && Array.isArray(req.user.roles) && req.user.roles.includes(role)) {
      return next();
    }
    return res.status(403).json({ error: 'Forbidden' });
  };
}

// Helper to create a token programmatically (useful for tests/local dev)
export function createToken({ id, name, email, roles = [] }, expiresIn = '7d') {
  const secret = process.env.AUTH_JWT_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error('AUTH_JWT_SECRET or JWT_SECRET not set');
  const payload = {
    sub: id,
    name,
    email,
    roles
  };
  return jwt.sign(payload, secret, { expiresIn });
}
