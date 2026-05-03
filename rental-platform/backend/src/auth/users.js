import User from '../models/User.js';
import {
  encrypt,
  decrypt,
  generateUserKey,
  blindIndex,
  protectKey,
  unprotectKey,
  normalizeEmail,
} from '../lib/encryption.js';

export function publicUser(user, decrypted = {}) {
  return {
    id: user._id,
    _id: user._id,
    fullName: decrypted.fullName,
    email: decrypted.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function findOrCreateUser({ email, fullName, role = 'guest' }) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    const error = new Error('Missing email');
    error.status = 400;
    throw error;
  }

  const safeRole = role || 'guest';
  const emailHash = blindIndex(normalizedEmail);
  let user = await User.findOne({ emailHash, role: safeRole });

  if (!user) {
    const userKey = generateUserKey();
    user = await User.create({
      fullName: encrypt(String(fullName || 'New Member').trim() || 'New Member', userKey),
      email: encrypt(normalizedEmail, userKey),
      emailHash,
      role: safeRole,
      userKey: protectKey(userKey),
    });
  } else if (fullName && String(fullName).trim()) {
    const realUserKey = unprotectKey(user.userKey);
    const currentName = decrypt(user.fullName, realUserKey);
    if (!currentName || currentName === 'New Member') {
      user.fullName = encrypt(String(fullName).trim(), realUserKey);
      await user.save();
    }
  }

  const realUserKey = unprotectKey(user.userKey);
  const decrypted = {
    fullName: decrypt(user.fullName, realUserKey),
    email: decrypt(user.email, realUserKey),
  };

  return {
    user,
    ...decrypted,
    public: publicUser(user, decrypted),
  };
}
