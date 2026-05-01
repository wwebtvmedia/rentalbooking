import { test, expect } from '@playwright/test';

test.describe('Production Role-Based Flows', () => {

  test('Host subdomain should route to Host Portal', async ({ page, baseURL }) => {
    if (baseURL?.includes('localhost') || baseURL?.includes('127.0.0.1')) {
      test.skip(true, 'Subdomain detection tests require DNS mapping and are skipped on localhost');
    }
    // 1. Visit host portal
    await page.goto('https://host.bestflats.vip');
    
    // 2. Verify heading indicates host context
    await expect(page.locator('text=host portal')).toBeVisible();

    // 3. Navigate to dashboard - should show Access Denied if unauthenticated
    await page.goto('https://host.bestflats.vip/host/dashboard');
    
    // Since we are unauthenticated on the live site, we expect the Access Denied gate
    const errorText = page.locator('text=/Access Denied|Token required/i');
    await expect(errorText).toBeVisible({ timeout: 10000 });
  });

  test('Concierge subdomain should route to Concierge Portal', async ({ page, baseURL }) => {
    if (baseURL?.includes('localhost') || baseURL?.includes('127.0.0.1')) {
      test.skip(true, 'Subdomain detection tests require DNS mapping and are skipped on localhost');
    }
    await page.goto('https://conci.bestflats.vip');
    await expect(page.locator('text=concierge portal')).toBeVisible();

    await page.goto('https://conci.bestflats.vip/concierge/dashboard');
    const errorText = page.locator('text=/Access Denied|Token required/i');
    await expect(errorText).toBeVisible({ timeout: 10000 });
  });

});
