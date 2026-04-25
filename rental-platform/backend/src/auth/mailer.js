import nodemailer from 'nodemailer';

// Simple mailer helper: in production configure SMTP via env vars
const createTransport = async () => {
  if (process.env.SMTP_URL) {
    return nodemailer.createTransport({
      url: process.env.SMTP_URL
    });
  }

  // fallback - use ethereal.email for real testing in dev
  try {
    const testAccount = await nodemailer.createTestAccount();
    console.log('ETHEREAL (dev): Created test account', testAccount.user);
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
      console.log('MAIL (dev): Message sent: %s', info.messageId);
      console.log('MAIL (dev): Preview URL: %s', nodemailer.getTestMessageUrl(info));
      return info;
    };
    return transporter;
  } catch (err) {
    console.error('MAIL (dev): Failed to create ethereal account, falling back to console log', err);
    return {
      sendMail: async (opts) => {
        console.log('MAIL (dev):', JSON.stringify(opts, null, 2));
        return Promise.resolve();
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
  if (!transport) await initTransport();
  const subject = 'Your sign-in link';
  const text = `Sign in using this link: ${link}\nThis link expires shortly.`;
  await transport.sendMail({ from: process.env.MAIL_FROM || 'no-reply@example.com', to: email, subject, text });
}
