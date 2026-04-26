import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

let mongodb;
const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-id' });

// Mock nodemailer
jest.unstable_mockModule('nodemailer', () => ({
  default: {
    createTransport: jest.fn().mockReturnValue({
      sendMail: mockSendMail
    }),
    createTestAccount: jest.fn().mockResolvedValue({ user: 'u', pass: 'p' }),
    getTestMessageUrl: jest.fn().mockReturnValue('http://e.com')
  }
}));

const { sendMagicLink } = await import('../src/auth/mailer.js');
const MagicToken = (await import('../src/models/MagicToken.js')).default;

describe('Mailer Abuse Protection', () => {
  beforeAll(async () => {
    mongodb = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    process.env.MONGO_URI = mongodb.getUri();
    await mongoose.connect(process.env.MONGO_URI);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongodb.stop();
  });

  it('should block mail bombing (more than 3 active tokens)', async () => {
    const email = 'victim@example.com';
    const link = 'http://l/m?token=';

    // 1. Create 3 active tokens manually
    await MagicToken.create([
        { jti: 't1', email, expiresAt: new Date(Date.now() + 900000) },
        { jti: 't2', email, expiresAt: new Date(Date.now() + 900000) },
        { jti: 't3', email, expiresAt: new Date(Date.now() + 900000) }
    ]);

    // 2. Attempt to send magic link
    await expect(sendMagicLink(email, link)).rejects.toThrow('Too many requests');
    
    // 3. Verify nodemailer was NOT called for the blocked attempt
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it('should allow sending if under the limit', async () => {
    const email = 'clean@example.com';
    const link = 'http://l/m?token=clean';
    
    await sendMagicLink(email, link);
    expect(mockSendMail).toHaveBeenCalled();
  });
});
