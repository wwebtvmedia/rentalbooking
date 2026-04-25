import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Force dev mode in browser to show simulate button
  await page.addInitScript(() => {
    window.localStorage.setItem('NEXT_PUBLIC_DEBUG', 'true');
    // We can't easily override process.env in browser but we can mock the check if needed
  });
});

test('booking redirection to payment and success simulation', async ({ page }) => {
  const mockApt = { _id: 'apt-pay-1', name: 'Premium Penthouse', depositAmount: 50000 };
  
  await page.route('**/apartments/**', route => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockApt) });
  });

  await page.route('**/calendar/events**', route => {
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });

  await page.route('**/bookings**', async route => {
    const method = route.request().method();
    if (method === 'POST') {
      await route.fulfill({ 
        status: 201, 
        contentType: 'application/json', 
        body: JSON.stringify({ _id: 'booking-123', depositAmount: 50000 }) 
      });
    } else {
      await route.fulfill({ 
        status: 200, 
        contentType: 'application/json', 
        body: JSON.stringify({ _id: 'booking-123', apartmentId: 'apt-pay-1', fullName: 'Jane Doe', start: new Date().toISOString(), end: new Date().toISOString(), depositAmount: 50000 }) 
      });
    }
  });

  await page.goto('/calendar?apartmentId=apt-pay-1');
  await page.getByRole('button', { name: 'Custom Request' }).click();
  await page.getByPlaceholder('Full legal name').fill('Jane Doe');
  await page.getByPlaceholder('your@prestige.com').fill('jane@example.com');
  await page.getByRole('button', { name: 'Confirm Privilege' }).click();

  await expect(page).toHaveURL(/\/payments\/booking-123/, { timeout: 30000 });
  await expect(page.locator('text=Jane Doe')).toBeVisible({ timeout: 30000 });

  await page.route('**/simulate-success', route => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
  });

  page.on('dialog', async dialog => {
    if (dialog.message().includes('success')) await dialog.accept();
  });

  const simulateBtn = page.locator('button:has-text("Simulate success")');
  await expect(simulateBtn).toBeVisible({ timeout: 20000 });
  await simulateBtn.click();
  
  await expect(page).toHaveURL(/\/calendar/, { timeout: 30000 });
});

test('crypto payment flow (USDC)', async ({ page }) => {
  const mockApt = { 
    _id: 'apt-crypto-1', 
    name: 'Crypto Loft', 
    depositAmount: 10000, 
    ethAddress: '0x1234567890123456789012345678901234567890' 
  };
  
  await page.route('**/apartments/**', route => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockApt) });
  });

  await page.route('**/bookings/**', route => {
    route.fulfill({ 
      status: 200, 
      contentType: 'application/json', 
      body: JSON.stringify({ 
        _id: 'booking-crypto', 
        apartmentId: 'apt-crypto-1', 
        fullName: 'Bob Crypto', 
        start: new Date().toISOString(), 
        end: new Date().toISOString(), 
        depositAmount: 10000 
      }) 
    });
  });

  await page.route('**/record-crypto-payment', route => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
  });

  await page.goto('/payments/booking-crypto');
  await expect(page.locator('text=Bob Crypto')).toBeVisible({ timeout: 30000 });
  
  const cryptoBtn = page.locator('button:has-text("Pay with USDC")');
  await expect(cryptoBtn).toBeVisible({ timeout: 20000 });
  await cryptoBtn.click();
  
  await expect(page.getByText('0x1234567890123456789012345678901234567890')).toBeVisible();
  await page.getByPlaceholder('Transaction Hash (0x...)').fill('0xabcdef1234567890');
  
  page.on('dialog', async dialog => {
    if (dialog.message().includes('recorded')) await dialog.accept();
  });

  await page.getByRole('button', { name: 'Confirm Transaction Hash' }).click();
  await expect(page).toHaveURL(/\/calendar/, { timeout: 30000 });
});
