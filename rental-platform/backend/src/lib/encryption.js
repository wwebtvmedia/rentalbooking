import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function getMasterSecret() {
  const secret = process.env.MASTER_ENCRYPTION_KEY;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('MASTER_ENCRYPTION_KEY must be set in production');
  }
  return secret || 'dev-only-master-encryption-key-change-me';
}

function getMasterKeyBuffer() {
  return crypto.createHash('sha256').update(getMasterSecret()).digest();
}

export const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

export const safeEqual = (a, b) => {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
};

/**
 * Protect a per-user key using the platform master key.
 * Legacy plaintext hex keys are still accepted by unprotectKey() for backwards compatibility.
 */
export const protectKey = (userKey) => {
  if (!userKey) return userKey;
  if (String(userKey).startsWith('v1:')) return userKey;

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getMasterKeyBuffer(), iv);
  let encrypted = cipher.update(String(userKey), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `v1:${iv.toString('hex')}:${authTag}:${encrypted}`;
};

export const unprotectKey = (protectedKey) => {
  if (!protectedKey) return protectedKey;
  const value = String(protectedKey);
  if (!value.startsWith('v1:')) return value;

  const [, ivHex, authTagHex, encrypted] = value.split(':');
  const decipher = crypto.createDecipheriv(ALGORITHM, getMasterKeyBuffer(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

export const generateUserKey = () => crypto.randomBytes(32).toString('hex');

export const encrypt = (text, userKey) => {
  if (text === undefined || text === null || text === '') return text;
  const rawKey = unprotectKey(userKey);
  const keyBuffer = Buffer.from(rawKey, 'hex');
  if (keyBuffer.length !== 32) throw new Error('Invalid user encryption key');

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);
  let encrypted = cipher.update(String(text), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
};

export const decrypt = (encryptedData, userKey) => {
  if (!encryptedData || !String(encryptedData).includes(':')) return encryptedData;
  const rawKey = unprotectKey(userKey);
  const [ivHex, authTagHex, encrypted] = String(encryptedData).split(':');
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(rawKey, 'hex'), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

export const blindIndex = (text) => {
  const normalized = normalizeEmail(text);
  if (!normalized) return '';
  return crypto.createHmac('sha256', getMasterSecret()).update(normalized).digest('hex');
};
