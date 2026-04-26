import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const TAG_LENGTH = 16;

// The Master Key protects the individual user keys
const MASTER_KEY = process.env.MASTER_ENCRYPTION_KEY || 'a-very-secret-master-key-for-bestflats-vip';

/**
 * Generate a unique encryption key for a new user
 */
export const generateUserKey = () => {
    return crypto.randomBytes(32).toString('hex');
};

/**
 * Encrypt data using a user-specific key
 */
export const encrypt = (text, userKey) => {
    if (!text) return text;
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(userKey, 'hex'), iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    
    // Return IV + AuthTag + EncryptedData
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
};

/**
 * Decrypt data using a user-specific key
 */
export const decrypt = (encryptedData, userKey) => {
    if (!encryptedData || !encryptedData.includes(':')) return encryptedData;
    
    const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(userKey, 'hex'), iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
};

/**
 * Generate a deterministic hash for searching (e.g. searching by email)
 * Since we can't search encrypted data, we store a blind index (hash).
 */
export const blindIndex = (text) => {
    return crypto.createHmac('sha256', MASTER_KEY).update(text.toLowerCase()).digest('hex');
};
