import { test, expect } from '@playwright/test';

test.describe('Production Business Flow', () => {

  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log('LIVE BROWSER:', msg.text()));
    page.on('pageerror', err => console.log('LIVE ERROR:', err.message));
  });
  
  test('should find seeded apartment and access its calendar', async ({ page }) => {
    await page.goto('https://www.bestflats.vip');
    
    // Check if any apartment cards are loaded
    const aptLinks = page.locator('a[href*="apartment?id="]');
    const count = await aptLinks.count();
    
    if (count === 0) {
      console.log('⚠️ No apartments found. Triggering seed...');
      await page.request.post('https://api.bestflats.vip/seed/unprotected?force=true');
      await page.reload();
      await page.waitForLoadState('networkidle');
    }

    const firstApt = page.locator('a[href*="apartment?id="]').first();
    await expect(firstApt).toBeVisible({ timeout: 20000 });
    
    const href = await firstApt.getAttribute('href');
    console.log('Clicking apartment link:', href);
    
    await firstApt.click();
    await page.waitForURL(/.*apartment\?id=.*/, { timeout: 20000 });
    
    // Wait for the detail page content to load
    // We expect the "Reserve" button to eventually appear
    const reserveBtn = page.locator('button:has-text("Reserve")');
    await expect(reserveBtn).toBeVisible({ timeout: 30000 });
    
    await reserveBtn.click();
    await expect(page).toHaveURL(/.*calendar\?apartmentId=.*/, { timeout: 20000 });
    
    // Final verification of calendar
    await expect(page.locator('.fc')).toBeVisible({ timeout: 20000 });
    await page.click('text=Custom Request');
    await expect(page.locator('text=Confirm Stay')).toBeVisible();
  });

  test('admin page should be reachable', async ({ page }) => {
    await page.goto('https://www.bestflats.vip/admin');
    await expect(page.locator('.brand-text')).toContainText('bestflats.vip Admin');
  });
});
