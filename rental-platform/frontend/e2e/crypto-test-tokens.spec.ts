import { test, expect } from '@playwright/test';

test('Pay with simulated Test Tokens (Ethereum)', async ({ page }) => {
  // Capture console logs from browser
  page.on('console', msg => {
    console.log(`BROWSER [${msg.type()}]: ${msg.text()}`);
  });

  // 1. Setup mock for Ethereum provider
  await page.addInitScript(() => {
    (window as any).ethereum = {
      isMetaMask: true,
      chainId: '0x1',
      request: async ({ method, params }: any) => {
        console.log('MOCK_ETH_REQUEST:', method, params);
        if (method === 'eth_requestAccounts') return ['0x1234567890123456789012345678901234567890'];
        if (method === 'eth_accounts') return ['0x1234567890123456789012345678901234567890'];
        if (method === 'eth_chainId') return '0x1';
        if (method === 'eth_sendTransaction') return '0xmocked_tx_hash_for_test_tokens';
        return null;
      },
      on: () => {},
      removeListener: () => {},
    };
  });

  // 2. Setup API mocks
  const mockApt = { 
    _id: 'apt-test-tokens', 
    name: 'Test Residence', 
    depositAmount: 1000, 
    ethAddress: '0xTestAddressForTokens'
  };

  await page.route('**/apartments/**', route => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockApt) });
  });

  await page.route('**/bookings/**', route => {
    const method = route.request().method();
    if (method === 'GET') {
      route.fulfill({ 
        status: 200, 
        contentType: 'application/json', 
        body: JSON.stringify({ 
          _id: 'booking-test-tokens', 
          apartmentId: 'apt-test-tokens', 
          fullName: 'Test User', 
          depositAmount: 1000 
        }) 
      });
    } else {
        route.continue();
    }
  });

  await page.route('**/record-crypto-payment', route => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
  });

  // 3. Perform the test
  await page.goto('/payments/booking-test-tokens');
  
  // Wait for loading to complete - Jane Doe / Test User check
  await expect(page.locator('text=Test User')).toBeVisible({ timeout: 30000 });

  // Use simple text locator for toggle
  const toggleBtn = page.locator('text=Pay with USDC');
  await expect(toggleBtn).toBeVisible({ timeout: 10000 });
  await toggleBtn.click();
  
  await expect(page.locator('text=0xTestAddressForTokens')).toBeVisible();

  page.on('dialog', async dialog => {
    if (dialog.message().includes('submitted')) {
      await dialog.accept();
    }
  });

  // Click MetaMask button
  const metaMaskBtn = page.locator('text=Pay with MetaMask');
  await expect(metaMaskBtn).toBeVisible();
  await metaMaskBtn.click();

  await expect(page).toHaveURL(/\/calendar/, { timeout: 20000 });
});
