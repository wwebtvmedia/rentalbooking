import { test, expect } from '@playwright/test';

test.describe('Multi-Profile Subdomain Logic', () => {

  test('Guest subdomain should show default portal', async ({ page }) => {
    await page.goto('/');
    const heading = page.locator('#auth h4');
    await expect(heading).toContainText(/Request Access/i);
  });

  test('Host subdomain should show host portal', async ({ page, baseURL }) => {
    if (baseURL?.includes('localhost') || baseURL?.includes('127.0.0.1')) {
      test.skip(true, 'Subdomain detection tests require DNS mapping and are skipped on localhost');
    }
    // We mock the hostname to simulate a subdomain
    await page.goto('https://host.bestflats.vip');
    const heading = page.locator('#auth h4');
    await expect(heading).toContainText(/host portal/i);
  });

  test('Concierge subdomain should show concierge portal', async ({ page, baseURL }) => {
    if (baseURL?.includes('localhost') || baseURL?.includes('127.0.0.1')) {
      test.skip(true, 'Subdomain detection tests require DNS mapping and are skipped on localhost');
    }
    await page.goto('https://conci.bestflats.vip');
    const heading = page.locator('#auth h4');
    await expect(heading).toContainText(/concierge portal/i);
  });

  test('Contractor subdomain should show contractor portal', async ({ page, baseURL }) => {
    if (baseURL?.includes('localhost') || baseURL?.includes('127.0.0.1')) {
      test.skip(true, 'Subdomain detection tests require DNS mapping and are skipped on localhost');
    }
    await page.goto('https://subcont.bestflats.vip');
    const heading = page.locator('#auth h4');
    await expect(heading).toContainText(/contractor portal/i);
  });

});

test.describe('Dashboard Security & Reachability', () => {
    
    test('Host Dashboard should require login', async ({ page }) => {
        await page.goto('/host/dashboard');
        // Since no token is present, it should show Access Denied or Token required or Unauthorized
        await expect(page.getByText(/Access Denied|Token required|Unauthorized/i)).toBeVisible({ timeout: 10000 });
    });

    test('Concierge Dashboard should require login', async ({ page }) => {
        await page.goto('/concierge/dashboard');
        await expect(page.getByText(/Access Denied|Token required|Unauthorized/i)).toBeVisible();
    });

    test('Enterprise Admin Dashboard should show certificate requirement', async ({ page }) => {
        await page.goto('/admin/dashboard');
        await expect(page.getByText(/valid Admin Certificate is required|valid Admin Session is required|Access Denied|Token required|Unauthorized/i)).toBeVisible();
    });
});
