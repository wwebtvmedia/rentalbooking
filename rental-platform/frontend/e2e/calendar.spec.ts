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
  await page.waitForTimeout(1000);
  
  await expect(page.getByRole('heading', { name: 'Schedule Your Stay' })).toBeVisible({ timeout: 15000 });

  // open modal using the Custom Request button
  const customRequestBtn = page.getByRole('button', { name: 'Custom Request' });
  await expect(customRequestBtn).toBeVisible({ timeout: 10000 });
  await customRequestBtn.click();
  
  await page.getByPlaceholder('Full legal name').fill('Test Guest');
  await page.getByPlaceholder('your@prestige.com').fill('test@example.com');
  
  const confirmBtn = page.getByRole('button', { name: 'Confirm Privilege' });
  await confirmBtn.click();

  // expect booking request to have been sent
  await expect.poll(() => bookingRequest, { timeout: 5000 }).not.toBeNull();
  expect(bookingRequest.method).toBe('POST');
  expect(bookingRequest.postData).toContain('Test Guest');
});
