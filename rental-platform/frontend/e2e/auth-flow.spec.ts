import { test, expect } from '@playwright/test';

test('magic link login flow', async ({ page }) => {
  const base = 'http://localhost:4000'; // Logical base
  
  // Mock magic link request
  await page.route('**/auth/magic', route => {
    route.fulfill({ 
      status: 200, 
      contentType: 'application/json', 
      body: JSON.stringify({ ok: true, message: 'Magic link sent' }) 
    });
  });

  // Mock verification
  await page.route('**/auth/magic/verify', route => {
    route.fulfill({ 
      status: 200, 
      contentType: 'application/json', 
      body: JSON.stringify({ 
        token: 'session-token', 
        user: { id: 'user123', fullName: 'John Doe', email: 'john@example.com' } 
      }) 
    });
  });

  await page.goto('/');
  
  // Find auth section
  const authSection = page.locator('#auth');
  await expect(authSection).toBeVisible();

  // Fill details
  await page.getByPlaceholder('Your Full Name').fill('John Doe');
  await page.getByPlaceholder('Email Address').fill('john@example.com');

  // Trigger magic link (mocked to just return "sent" usually, but in our code it alerts)
  // We need to handle the alert
  page.on('dialog', async dialog => {
    expect(dialog.message()).toMatch(/Magic link sent|Welcome|Logged in/);
    await dialog.accept();
  });

  // Specifically click the one in the auth section
  await page.locator('#auth').getByRole('button', { name: 'Sign In' }).click();

  // Now simulate coming back with a token
  await page.goto('/magic-callback?token=some-magic-token');

  // Wait for redirect back to home
  await expect(page).toHaveURL('/');

  // Check if header shows the user
  await expect(page.locator('text=Member: John')).toBeVisible();
});

test('logout flow', async ({ page }) => {
  // Stub a logged-in guest
  await page.addInitScript(() => {
    window.localStorage.setItem('guest', JSON.stringify({ fullName: 'Alice Wonderland', email: 'alice@example.com' }));
    window.localStorage.setItem('token', 'alice-token');
  });

  await page.goto('/');

  // Check if header shows the user
  await expect(page.locator('text=Member: Alice')).toBeVisible();

  // Click exit
  await page.click('text=Exit');

  // Member info should be gone
  await expect(page.locator('text=Member: Alice')).not.toBeVisible();
  await expect(page.locator('text=Sign In').first()).toBeVisible();
});
