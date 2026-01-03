import nodemailer from 'nodemailer';

// Simple mailer helper: in production configure SMTP via env vars
const createTransport = () => {
  if (process.env.SMTP_URL) {
    return nodemailer.createTransport({
      url: process.env.SMTP_URL
    });
  }
  // fallback - use a stub transporter that logs to console
  return {
    sendMail: async (opts) => {
      console.log('MAIL (dev):', JSON.stringify(opts, null, 2));
      return Promise.resolve();
    }
  };
};

const transport = createTransport();

export async function sendMagicLink(email, link) {
  const subject = 'Your sign-in link';
  const text = `Sign in using this link: ${link}\nThis link expires shortly.`;
  // For production, use HTML and better templates
  await transport.sendMail({ from: process.env.MAIL_FROM || 'no-reply@example.com', to: email, subject, text });
}
