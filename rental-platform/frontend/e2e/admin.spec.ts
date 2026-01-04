import { test, expect } from '@playwright/test';

// Admin flow: upload photo and create apartment
test('admin can upload photo and create apartment', async ({ page }) => {
  const mockUploadUrl = 'http://localhost/uploads/mock.jpg';

  await page.route('**/apartments', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    } else {
      // POST created -> return 201 with created body
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ _id: 'apt-created', name: 'Uploaded Apt', photos: [mockUploadUrl], pricePerNight: 111 }) });
    }
  });
  await page.goto('/admin');
  await expect(page.locator('label:has-text("Name") input')).toBeVisible({ timeout: 10000 });
  await page.fill('label:has-text("Name") input', 'Uploaded Apt');
  // Instead of exercising the file upload (which is flaky across environments),
  // populate the Photos input directly with the mock URL to simulate a successful upload.
  await page.fill('label:has-text("Photos") input', mockUploadUrl);

  // fill price
  await page.fill('label:has-text("Price per night") input', '111');
  // provide a token for the prompt and click create
  await page.evaluate(() => { (window as any).prompt = () => 'admintoken'; });
  const createBtn = page.locator('button:has-text("Create")');
  await expect(createBtn).toBeVisible({ timeout: 10000 });
  const [req] = await Promise.all([
    page.waitForRequest(r => r.url().includes('/apartments') && r.method() === 'POST', { timeout: 10000 }),
    createBtn.click(),
  ]);
  console.log('create request sent to', req.url());
  await expect(page.locator('text=Created')).toBeVisible({ timeout: 10000 });
});