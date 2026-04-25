import { test, expect } from '@playwright/test';

// Admin flow: upload photo and create apartment
test('admin can upload photo and create apartment', async ({ page }) => {
  const mockUploadUrl = 'http://localhost/uploads/mock.jpg';

  await page.route('**/apartments', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    } else {
      // POST created -> return 201 with created body
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ _id: 'apt-created', name: 'Uploaded Apt', photos: [mockUploadUrl, mockUploadUrl, mockUploadUrl], pricePerNight: 111 }) });
    }
  });

  await page.goto('/admin');
  await page.waitForTimeout(1000);

  // Use placeholder for robust selection
  const nameInput = page.getByPlaceholder('Luxury Loft');
  await expect(nameInput).toBeVisible({ timeout: 15000 });
  await nameInput.fill('Uploaded Apt');
  
  // fill description
  await page.getByPlaceholder('Full description...').fill('Luxury stay');

  // fill price
  await page.locator('input[type="number"]').first().fill('111');

  // fill photos (at least 3 required)
  await page.getByPlaceholder('URL1, URL2, ...').fill('http://example.com/1.jpg, http://example.com/2.jpg, http://example.com/3.jpg');
  
  // provide a token for the prompt and click create
  await page.evaluate(() => { (window as any).prompt = () => 'admintoken'; });
  
  const createBtn = page.getByRole('button', { name: 'Create Listing' });
  await expect(createBtn).toBeVisible({ timeout: 10000 });
  
  const [req] = await Promise.all([
    page.waitForRequest(r => r.url().includes('/apartments') && r.method() === 'POST', { timeout: 10000 }),
    createBtn.click(),
  ]);
  
  await expect(page.getByText('Created', { exact: false })).toBeVisible({ timeout: 10000 });
});
