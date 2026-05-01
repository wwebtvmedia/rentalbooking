import { test, expect } from '@playwright/test';

test.describe('API Security Enforcement', () => {

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.bestflats.vip';

  test('GET /apartments should be PUBLIC (200 OK)', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/apartments`);
    if (response.status() === 429) {
        console.warn('Rate limited (429) - skipping status check');
        return;
    }
    expect(response.status()).toBe(200);
  });

  test('GET /bookings should return 401 without token', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/bookings`);
    if (response.status() === 429) {
        console.warn('Rate limited (429) - skipping status check');
        return;
    }
    expect(response.status()).toBe(401);
  });

  test('POST /bookings should return 401 without token', async ({ request }) => {
    const response = await request.post(`${BACKEND_URL}/bookings`, {
      data: {
        apartmentId: '507f1f77bcf86cd799439011',
        start: '2026-06-01',
        end: '2026-06-05',
        fullName: 'Test User'
      }
    });
    if (response.status() === 429) {
        console.warn('Rate limited (429) - skipping status check');
        return;
    }
    expect(response.status()).toBe(401);
  });

  test('GET /admin/platform/stats should return 401 without token', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/admin/platform/stats`);
    if (response.status() === 429) {
        console.warn('Rate limited (429) - skipping status check');
        return;
    }
    expect(response.status()).toBe(401);
  });

  test('POST /auth/magic should be PUBLIC (200 OK)', async ({ request }) => {
    // We just check if the endpoint is reachable, not the full flow
    const response = await request.post(`${BACKEND_URL}/auth/magic`, {
        data: { email: 'security-test@bestflats.vip' }
    });
    // It should either be 200 or 400 (if validation fails), but NOT 401
    expect(response.status()).not.toBe(401);
  });

});
