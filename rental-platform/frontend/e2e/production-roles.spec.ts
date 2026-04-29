import { test, expect } from '@playwright/test';

test.describe('Production Role-Based Flows', () => {

  test('Host subdomain should route to Host Analytics', async ({ page, baseURL }) => {
    if (baseURL?.includes('localhost') || baseURL?.includes('127.0.0.1')) {
      test.skip(true, 'Subdomain detection tests require DNS mapping and are skipped on localhost');
    }
    // 1. Visit host portal
    await page.goto('https://host.bestflats.vip');
    
    // 2. Verify heading indicates host context
    await expect(page.locator('text=host portal')).toBeVisible();

    // 3. Simulate a successful Host Session (Mocking the verification result)
    // In a full live test, we'd need to intercept the magic link.
    // Here we verify that the UI correctly reacts to a Host role.
    await page.addInitScript(() => {
        window.localStorage.setItem('guest', JSON.stringify({ 
            fullName: 'Master Host', 
            email: 'host@bestflats.vip',
            role: 'host' 
        }));
        window.localStorage.setItem('token', 'valid-mock-host-token');
    });

    await page.goto('https://host.bestflats.vip/host/dashboard');
    
    // 4. Verify Host-specific elements are visible
    await expect(page.locator('text=Host Analytics')).toBeVisible();
    await expect(page.locator('text=Tax Declaration')).toBeVisible();
  });

  test('Concierge subdomain should route to Service Hub', async ({ page, baseURL }) => {
    if (baseURL?.includes('localhost') || baseURL?.includes('127.0.0.1')) {
      test.skip(true, 'Subdomain detection tests require DNS mapping and are skipped on localhost');
    }
    await page.goto('https://conci.bestflats.vip');
    await expect(page.locator('text=concierge portal')).toBeVisible();

    await page.addInitScript(() => {
        window.localStorage.setItem('guest', JSON.stringify({ 
            fullName: 'Lead Concierge', 
            email: 'conci@bestflats.vip',
            role: 'concierge' 
        }));
        window.localStorage.setItem('token', 'valid-mock-conci-token');
    });

    await page.goto('https://conci.bestflats.vip/concierge/dashboard');
    await expect(page.locator('text=Concierge Hub')).toBeVisible();
    await expect(page.locator('text=Financial Overview')).toBeVisible();
  });

});
