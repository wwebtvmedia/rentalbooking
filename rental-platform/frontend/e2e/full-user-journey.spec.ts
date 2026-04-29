import { test, expect } from '@playwright/test';

test.describe('End-to-End User Journey (UI + SMTP)', () => {

  const MAILPIT_API = process.env.MAILPIT_API || 'http://localhost:8025/api/v1/messages';
  const testEmail = `tester-${Date.now()}@bestflats.vip`;
  const testName = 'Automated Tester';

  test.beforeAll(async ({ request }) => {
    // Check if Mailpit is reachable
    try {
      const res = await request.get(MAILPIT_API);
      if (res.status() !== 200) {
        console.warn('WARNING: Mailpit API not responding. Full user journey test might fail.');
      }
    } catch (e) {
      console.warn('WARNING: Could not connect to Mailpit. Ensure it is running for this test to pass.');
    }
  });

  test('should register a new user and login via Mailpit magic link', async ({ page, request }) => {
    // 1. Visit the homepage
    await page.goto('/');
    
    // 2. Fill in Registration
    await page.locator('#auth').scrollIntoViewIfNeeded();
    await page.getByPlaceholder('Your Full Name').fill(testName);
    await page.getByPlaceholder('Email Address').fill(testEmail);

    // Accept the alert
    page.on('dialog', async d => await d.accept());
    await page.getByRole('button', { name: 'Create Account' }).click();

    // 3. Retrieve the Magic Link from Mailpit
    console.log(`Waiting for email to ${testEmail}...`);
    
    let magicLink = '';
    // Poll Mailpit API for the new message
    await expect.poll(async () => {
      try {
        const res = await request.get(MAILPIT_API);
        const data = await res.json();
        const message = data.messages.find(m => m.To[0].Address === testEmail);
        
        if (message) {
          // Fetch the detailed content of this message
          const detailRes = await request.get(`${MAILPIT_API}/${message.ID}`);
          const detailData = await detailRes.json();
          const body = detailData.Snippet || detailData.Text || '';
          
          // Extract URL using regex (matches our callback pattern)
          // It could be localhost or production URL depending on backend config
          const match = body.match(/https?:\/\/[^\s]+magic-callback[^\s]*/);
          if (match) {
              magicLink = match[0];
              // If it's a production URL but we are testing locally, 
              // we might need to swap the domain to match our baseURL
              if (magicLink.includes('bestflats.vip') && !process.env.CI_PROD) {
                const url = new URL(magicLink);
                const baseURL = test.info().project.use.baseURL || 'http://localhost:3000';
                const base = new URL(baseURL);
                url.protocol = base.protocol;
                url.host = base.host;
                magicLink = url.toString();
              }
              return true;
          }
        }
      } catch (e) {
        return false;
      }
      return false;
    }, {
      message: 'Email never arrived in Mailpit or magic link not found',
      timeout: 30000,
    }).toBe(true);

    console.log('Magic Link found:', magicLink);

    // 4. Use the link to log in
    await page.goto(magicLink);

    // 5. Verify successful login
    // We expect to see "Member: Automated" in the header
    await expect(page.locator('text=Member: Automated')).toBeVisible({ timeout: 15000 });
    
    console.log('User successfully logged in via SMTP link!');
  });
});
