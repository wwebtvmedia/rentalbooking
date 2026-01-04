import { test, expect } from '@playwright/test';

// This test stubs network requests so it doesn't require a backend running.
test('can open booking modal and submit booking', async ({ page }) => {
  await page.route('**/calendar/events**', route => {
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });

  let bookingRequest: any = null;
  await page.route('**/bookings', async (route) => {
    const req = route.request();
    bookingRequest = {
      method: req.method(),
      postData: await req.postData()
    };
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'bk_123' }) });
  });

  await page.goto('/calendar');
  await expect(page.locator('text=Calendar')).toBeVisible({ timeout: 10000 });

  // open modal using the New booking button (wait for the button to appear)
  await expect(page.locator('text=New booking')).toBeVisible({ timeout: 10000 });
  await page.click('text=New booking');
  await page.fill('label:has-text("Name") input', 'Test Guest');
  await page.fill('label:has-text("Email") input', 'test@example.com');
  await page.click('button:has-text("Create booking")');

  // expect booking request to have been sent
  await page.waitForTimeout(200);
  expect(bookingRequest).not.toBeNull();
  expect(bookingRequest.method).toBe('POST');
  expect(bookingRequest.postData).toContain('Test Guest');
});
