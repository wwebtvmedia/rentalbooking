import { test, expect } from '@playwright/test';

test.describe('Production Authentication Flow', () => {
  
  test('should be able to request a magic link on live site', async ({ page }) => {
    await page.goto('/');
    
    // Find auth section
    const authSection = page.locator('#auth');
    await expect(authSection).toBeVisible();

    // Fill details
    await page.getByPlaceholder('Your Full Name').fill('Test Logger');
    await page.getByPlaceholder('Email Address').fill('test-logger@example.com');

    // Handle the alert dialog
    page.on('dialog', async dialog => {
      console.log('Production Auth Alert:', dialog.message());
      expect(dialog.message()).toMatch(/Verification link sent|Magic link sent|Logged in|Welcome! Account created/i);
      await dialog.accept();
    });

    // Click "Sign In" or "Create Account"
    // On the home page, the button text is "Create Account" or "Sign In" inside the auth card
    const signInBtn = authSection.getByRole('button', { name: /Sign In|Create Account/i }).first();
    await signInBtn.click();
    
    // The alert should have been triggered by now
  });

  test('Sign In button in header should scroll to auth section', async ({ page }) => {
    await page.goto('/');
    
    // Click header Sign In
    const headerSignIn = page.locator('text=Sign In').first();
    await headerSignIn.click();
    
    // Check if #auth is in viewport
    const authSection = page.locator('#auth');
    await expect(authSection).toBeInViewport();
  });
});
