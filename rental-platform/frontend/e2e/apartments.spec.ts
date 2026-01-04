import { test, expect } from '@playwright/test';

// Verify apartments listing and calendar shows apartment details
test('apartments list and calendar shows apartment details', async ({ page }) => {
  const mockApt = { _id: 'apt-test-1', name: 'Mock Apt', description: 'Nice place', photos: ['https://example.com/photo.jpg'], pricePerNight: 99, rules: 'No parties', lat: 51.5, lon: -0.1 };

  await page.route('**/apartments', route => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([mockApt]) });
  });

  await page.route('**/calendar/events**', route => {
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });

  // respond to apartment detail request
  await page.route('**/apartments/apt-test-1', route => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockApt) });
  });

  // ensure the UI shows apartments by stubbing a logged-in guest in localStorage
  await page.addInitScript(() => {
    window.localStorage.setItem('guest', JSON.stringify({ fullName: 'Tester', email: 'test@example.com' }));
    window.localStorage.setItem('token', '');
  });

  await page.goto('/');
  // wait for the apartments request to complete and UI to render
  await page.waitForResponse(r => r.url().endsWith('/apartments') && r.status() === 200);
  await expect(page.locator(`text=${mockApt.name}`)).toBeVisible({ timeout: 10000 });
  await page.click(`text=${mockApt.name}`);
  await page.click('text=View calendar');

  // Calendar page should show header
  await expect(page.locator('text=Calendar')).toBeVisible();

  // Open new booking modal and ensure the apartment info appears
  await page.click('text=New booking');
  await expect(page.locator(`text=${mockApt.name}`)).toBeVisible();
  await expect(page.locator(`text=Price/night: $${mockApt.pricePerNight}`)).toBeVisible();
});