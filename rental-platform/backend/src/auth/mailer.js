import nodemailer from 'nodemailer';
import { logger } from '../logger.js';
import MagicToken from '../models/MagicToken.js';
import { blindIndex, normalizeEmail } from '../lib/encryption.js';

const createTransport = async () => {
  if (process.env.SMTP_URL) {
    logger.info('MAIL_INIT: Using SMTP URL from environment');
    return nodemailer.createTransport({ url: process.env.SMTP_URL });
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
const initTransport = async () => {
  transport = await createTransport();
};
initTransport();

export async function sendMagicLink(email, link) {
  const forensicId = Math.random().toString(36).substring(7);
  const normalizedEmail = normalizeEmail(email);
  const emailHash = blindIndex(normalizedEmail);
  logger.info({ forensicId, emailHash }, 'MAIL_REQUEST_RECEIVED: Starting send process');

  try {
    if (!transport) await initTransport();

    const recentTokensCount = await MagicToken.countDocuments({
      emailHash,
      expiresAt: { $gt: new Date() }
    });

    if (recentTokensCount >= 3) {
      logger.warn({ forensicId, emailHash, count: recentTokensCount }, 'MAIL_ABUSE_DETECTED: Rate limit exceeded for this email');
      throw new Error('Too many requests. Please wait a few minutes before trying again.');
    }

    const result = await transport.sendMail({
      from: process.env.MAIL_FROM || 'no-reply@example.com',
      to: normalizedEmail,
      subject: 'Your sign-in link',
      text: `Sign in using this link: ${link}\nThis link expires shortly.`
    });

    logger.info({ forensicId, emailHash, messageId: result?.messageId || 'N/A' }, 'MAIL_REQUEST_COMPLETED: Magic link successfully dispatched');
  } catch (err) {
    logger.error({ forensicId, emailHash, err: err.message }, 'MAIL_REQUEST_FAILED: Error during email dispatch');
    throw err;
  }
}
