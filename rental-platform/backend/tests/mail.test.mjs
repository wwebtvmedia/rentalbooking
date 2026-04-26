import { jest } from '@jest/globals';

const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-id' });

// We mock nodemailer BEFORE importing the mailer
jest.unstable_mockModule('nodemailer', () => ({
  default: {
    createTransport: jest.fn().mockReturnValue({
      sendMail: mockSendMail
    }),
    createTestAccount: jest.fn().mockResolvedValue({
      user: 'test-user',
      pass: 'test-pass'
    }),
    getTestMessageUrl: jest.fn().mockReturnValue('http://ethereal.email/test')
  }
}));

const { sendMagicLink } = await import('../src/auth/mailer.js');

describe('Mailer Logic', () => {
  it('should call sendMail with correct parameters', async () => {
    const email = 'test@example.com';
    const link = 'http://localhost:3000/magic-callback?token=xyz';
    
    await sendMagicLink(email, link);
    
    expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: email,
      subject: 'Your sign-in link',
      text: expect.stringContaining(link)
    }));
  });
});
