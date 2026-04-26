import nodemailer from 'nodemailer';
import { logger } from '../logger.js';
import MagicToken from '../models/MagicToken.js';

// Simple mailer helper: in production configure SMTP via env vars
const createTransport = async () => {
  if (process.env.SMTP_URL) {
    logger.info('MAIL_INIT: Using SMTP URL from environment');
    return nodemailer.createTransport({
      url: process.env.SMTP_URL
    });
  }

  // fallback - use ethereal.email for real testing in dev
  try {
    const testAccount = await nodemailer.createTestAccount();
    logger.info({ user: testAccount.user }, 'MAIL_INIT: Created Ethereal test account');
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });

    const originalSendMail = transporter.sendMail.bind(transporter);
    transporter.sendMail = async (opts) => {
      const info = await originalSendMail(opts);
      logger.info({ 
        messageId: info.messageId, 
        to: opts.to, 
        preview: nodemailer.getTestMessageUrl(info) 
      }, 'MAIL_SENT: Success via Ethereal');
      return info;
    };
    return transporter;
  } catch (err) {
    logger.error({ err }, 'MAIL_INIT: Failed to create ethereal account, falling back to console log');
    return {
      sendMail: async (opts) => {
        logger.info({ mail: opts }, 'MAIL_DUMMY: Simulation via console log');
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

/**
 * Sends a magic link with rate-limiting and forensic logging.
 * Protects against mail bombing by checking recent tokens for the same email.
 */
export async function sendMagicLink(email, link) {
  const forensicId = Math.random().toString(36).substring(7);
  logger.info({ forensicId, email }, 'MAIL_REQUEST_RECEIVED: Starting send process');

  try {
    if (!transport) await initTransport();

    // 🛡️ Anti-Mail Bombing: Check how many tokens were requested for this email in the last 15 mins
    const recentTokensCount = await MagicToken.countDocuments({
      email: email,
      expiresAt: { $gt: new Date() } // Tokens expire in 15 mins, so this effectively checks active tokens
    });

    if (recentTokensCount >= 3) {
      logger.warn({ forensicId, email, count: recentTokensCount }, 'MAIL_ABUSE_DETECTED: Rate limit exceeded for this email');
      throw new Error('Too many requests. Please wait a few minutes before trying again.');
    }

    const subject = 'Your sign-in link';
    const text = `Sign in using this link: ${link}\nThis link expires shortly.`;

    const result = await transport.sendMail({ 
        from: process.env.MAIL_FROM || 'no-reply@example.com', 
        to: email, 
        subject, 
        text 
    });

    logger.info({ 
        forensicId, 
        email, 
        messageId: result?.messageId || 'N/A' 
    }, 'MAIL_REQUEST_COMPLETED: Magic link successfully dispatched');
    
  } catch (err) {
    logger.error({ forensicId, email, err: err.message }, 'MAIL_REQUEST_FAILED: Error during email dispatch');
    throw err;
  }
}
