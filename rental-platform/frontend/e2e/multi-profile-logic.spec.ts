import { test, expect } from '@playwright/test';

test.describe('Multi-Profile Subdomain Logic', () => {

  test('Guest subdomain should show default portal', async ({ page }) => {
    await page.goto('https://www.bestflats.vip');
    const heading = page.locator('#auth h4');
    await expect(heading).toContainText(/Request Access/i);
  });

  test('Host subdomain should show host portal', async ({ page }) => {
    // We mock the hostname to simulate a subdomain
    await page.goto('https://host.bestflats.vip');
    const heading = page.locator('#auth h4');
    await expect(heading).toContainText(/host portal/i);
  });

  test('Concierge subdomain should show concierge portal', async ({ page }) => {
    await page.goto('https://conci.bestflats.vip');
    const heading = page.locator('#auth h4');
    await expect(heading).toContainText(/concierge portal/i);
  });

  test('Contractor subdomain should show contractor portal', async ({ page }) => {
    await page.goto('https://subcont.bestflats.vip');
    const heading = page.locator('#auth h4');
    await expect(heading).toContainText(/contractor portal/i);
  });

});

test.describe('Dashboard Security & Reachability', () => {
    
    test('Host Dashboard should require login', async ({ page }) => {
        await page.goto('https://host.bestflats.vip/host/dashboard');
        // Since no token is present, it should show Access Denied or redirect
        await expect(page.locator('text=Access Denied')).toBeVisible({ timeout: 10000 });
    });

    test('Concierge Dashboard should require login', async ({ page }) => {
        await page.goto('https://conci.bestflats.vip/concierge/dashboard');
        await expect(page.locator('text=Access Denied')).toBeVisible();
    });

    test('Enterprise Admin Dashboard should show certificate requirement', async ({ page }) => {
        await page.goto('https://www.bestflats.vip/admin/dashboard');
        await expect(page.locator('text=valid Admin Certificate is required')).toBeVisible();
    });
});
