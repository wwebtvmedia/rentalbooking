import nodemailer from 'nodemailer';
import { logger } from '../logger.js';
import MagicToken from '../models/MagicToken.js';
import { blindIndex, normalizeEmail } from '../lib/encryption.js';

function boolEnv(name, fallback = false) {
  const value = process.env[name];
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function createSmtpOptionsFromEnv() {
  if (process.env.SMTP_URL) return process.env.SMTP_URL;
  if (!process.env.SMTP_HOST) return null;

  const port = Number(process.env.SMTP_PORT || 587);
  return {
    host: process.env.SMTP_HOST,
    port: Number.isFinite(port) ? port : 587,
    secure: boolEnv('SMTP_SECURE', port === 465),
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || '' }
      : undefined,
  };
}

const createTransport = async () => {
  const smtpOptions = createSmtpOptionsFromEnv();
  if (smtpOptions) {
    logger.info('MAIL_INIT: Using SMTP configuration from environment');
    return nodemailer.createTransport(smtpOptions);
  }

  if (process.env.NODE_ENV === 'production' && !boolEnv('ALLOW_ETHEREAL_IN_PRODUCTION')) {
    throw new Error('SMTP is not configured. Set SMTP_URL or SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS to send account emails.');
  }

  try {
    const testAccount = await nodemailer.createTestAccount();
    logger.info({ user: testAccount.user }, 'MAIL_INIT: Created Ethereal test account');
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass }
    });

    const originalSendMail = transporter.sendMail.bind(transporter);
    transporter.sendMail = async (opts) => {
      const info = await originalSendMail(opts);
      logger.info({ messageId: info.messageId, preview: nodemailer.getTestMessageUrl(info) }, 'MAIL_SENT: Success via Ethereal');
      return info;
    };
    return transporter;
  } catch (err) {
    logger.error({ err }, 'MAIL_INIT: Failed to create ethereal account, falling back to console log');
    return {
      sendMail: async (opts) => {
        logger.info({ toHash: blindIndex(opts.to), subject: opts.subject }, 'MAIL_DUMMY: Simulation via console log');
        return Promise.resolve({ messageId: 'dummy-id' });
      }
    };
  }
};

let transport;
let transportInitPromise;
const initTransport = async () => {
  if (!transportInitPromise) {
    transportInitPromise = createTransport().then((created) => {
      transport = created;
      return created;
    }).catch((err) => {
      transportInitPromise = null;
      throw err;
    });
  }
  return transportInitPromise;
};

if (process.env.NODE_ENV !== 'test') {
  initTransport().catch((err) => logger.error({ err: err.message }, 'MAIL_INIT: Failed'));
}

export async function assertCanSendMagicLink(email) {
  const normalizedEmail = normalizeEmail(email);
  const emailHash = blindIndex(normalizedEmail);
  const recentTokensCount = await MagicToken.countDocuments({
    emailHash,
    expiresAt: { $gt: new Date() }
  });

  if (recentTokensCount >= 3) {
    const error = new Error('Too many requests. Please wait a few minutes before trying again.');
    error.status = 429;
    throw error;
  }
}

export async function sendMagicLink(email, link) {
  const forensicId = Math.random().toString(36).substring(7);
  const normalizedEmail = normalizeEmail(email);
  const emailHash = blindIndex(normalizedEmail);
  logger.info({ forensicId, emailHash }, 'MAIL_REQUEST_RECEIVED: Starting send process');

  try {
    if (!transport) await initTransport();

    const result = await transport.sendMail({
      from: process.env.MAIL_FROM || 'no-reply@example.com',
      to: normalizedEmail,
      subject: 'Your sign-in link',
      text: `Sign in using this link: ${link}\nThis link expires shortly.`
    });

    logger.info({ forensicId, emailHash, messageId: result?.messageId || 'N/A' }, 'MAIL_REQUEST_COMPLETED: Magic link successfully dispatched');
    return result;
  } catch (err) {
    logger.error({ forensicId, emailHash, err: err.message }, 'MAIL_REQUEST_FAILED: Error during email dispatch');
    throw err;
  }
}
