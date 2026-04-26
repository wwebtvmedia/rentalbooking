import { test, expect } from '@playwright/test';

test.describe('End-to-End User Journey (UI + SMTP)', () => {

  const MAILPIT_API = 'http://localhost:8025/api/v1/messages';
  const testEmail = `tester-${Date.now()}@bestflats.vip`;
  const testName = 'Automated Tester';

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
      const res = await request.get(MAILPIT_API);
      const data = await res.json();
      const message = data.messages.find(m => m.To[0].Address === testEmail);
      
      if (message) {
        // Fetch the detailed content of this message
        const detailRes = await request.get(`${MAILPIT_API}/${message.ID}`);
        const detailData = await detailRes.json();
        const body = detailData.Snippet || detailData.Text || '';
        
        // Extract URL using regex (matches our callback pattern)
        const match = body.match(/https?:\/\/[^\s]+/);
        if (match) {
            magicLink = match[0];
            return true;
        }
      }
      return false;
    }, {
      message: 'Email never arrived in Mailpit',
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
