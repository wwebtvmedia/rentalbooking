import { test, expect } from '@playwright/test';

test.describe('Production Inventory Verification', () => {

  test('should display all 3 curated properties on the homepage', async ({ page }) => {
    await page.goto('https://www.bestflats.vip');
    
    // We expect 3 distinct property titles to eventually load
    const properties = [
      'Comfortable and Convenient Stay in the Heart of Suresnes',
      'Club Farah Nabeul Bungalow',
      'Azure Antibes Flat'
    ];

    for (const title of properties) {
      const locator = page.locator(`text=${title}`).first();
      await expect(locator).toBeVisible({ timeout: 15000 });
    }
  });

  test('each property should have its specific pricing visible', async ({ page }) => {
    await page.goto('https://www.bestflats.vip');
    
    // Check Antibes Price
    await expect(page.locator('text=$180')).toBeVisible();
    // Check Nabel Price
    await expect(page.locator('text=$90')).toBeVisible();
    // Check Suresnes Price
    await expect(page.locator('text=$160')).toBeVisible();
  });

});
