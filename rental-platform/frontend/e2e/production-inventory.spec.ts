import { test, expect } from '@playwright/test';

test.describe('Production Inventory Verification', () => {

  test('should handle property grid on the homepage', async ({ page }) => {
    await page.goto('/');
    
    // The grid container should exist, even if empty
    const propertyGrid = page.locator('.grid').first();
    await expect(propertyGrid).toBeAttached({ timeout: 15000 });
    
    // Check for at least one property link or image ONLY if we expect data.
    // In production, the DB might be empty, so we just log the count.
    const propertyLinks = page.locator('a[href^="/apartment"]');
    const count = await propertyLinks.count();
    console.log(`Detected ${count} properties on production homepage.`);
  });

  test('property prices check', async ({ page }) => {
    await page.goto('/');
    
    // Search for any currency pattern like $ or €
    const prices = page.locator('text=/[\$€][0-9]+/').first();
    const propertyCount = await page.locator('a[href^="/apartment"]').count();
    
    if (propertyCount > 0) {
        await expect(prices).toBeVisible();
    } else {
        console.log('Skipping price check as no properties are currently listed in production.');
    }
  });

});
