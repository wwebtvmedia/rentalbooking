import { test, expect } from '@playwright/test';

// We explicitly set the metadata to point to the live site
test.use({ baseURL: 'https://www.bestflats.vip' });

test.describe('Production Live Verification', () => {
  
  test('homepage should be live and branded correctly', async ({ page }) => {
    await page.goto('/');
    
    // Verify Title
    await expect(page).toHaveTitle(/bestflats.vip/i);
    
    // Verify Branding
    const brand = page.locator('.brand-text').first();
    await expect(brand).toContainText('bestflats.vip');
    
    // Verify Hero Section
    await expect(page.locator('text=Your private sanctuary awaits.')).toBeVisible();
  });

  test('navigation to collections should work', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Collections');
    await expect(page).toHaveURL(/.*collections/);
    await expect(page.locator('h1')).toContainText('The Collection.');
  });

  test('API connectivity check', async ({ page }) => {
    // Check if the API responds (we expect a 200 or 403, but not a connection failure)
    const response = await page.request.get('https://api.bestflats.vip/apartments');
    expect(response.status()).toBeLessThan(500); 
    
    const data = await response.json();
    console.log('Production API Apartment Count:', data.length);
  });
});
