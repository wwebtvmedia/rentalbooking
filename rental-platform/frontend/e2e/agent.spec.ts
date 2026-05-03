import { test, expect } from '@playwright/test';

test.describe('Secure Agent Tunnel (MCP)', () => {

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

  test('MCP connection should fail without token', async ({ page }) => {
    await page.goto('/');

    const mcpResult = await page.evaluate(async (url) => {
      return new Promise((resolve) => {
        // EventSource doesn't support headers natively, 
        // so it will send a request without the Authorization header.
        const es = new EventSource(`${url}/mcp`);
        es.onerror = () => {
          es.close();
          resolve('failed'); // We expect failure because of 401
        };
        es.onopen = () => {
          es.close();
          resolve('opened');
        };
        setTimeout(() => { es.close(); resolve('timeout'); }, 3000);
      });
    }, BACKEND_URL);

    expect(mcpResult).toBe('failed');
  });

  test('MCP connection should succeed with valid agent token', async ({ page, baseURL }) => {
    if (!baseURL?.includes('localhost') && !baseURL?.includes('127.0.0.1')) {
      test.skip(true, 'MCP success tests require internal test-mode endpoints not enabled in production.');
    }
    const testEmail = `agent-verify-${Date.now()}@bestflats.vip`;
    // 1. Get an agent token (using the test-mode endpoint)
    const tokenRes = await page.request.post(`${BACKEND_URL}/auth/magic`, {
        data: { email: testEmail, role: 'admin' }
    });
    const tokenData = await tokenRes.json();
    console.log('Magic Token Response:', tokenData);
    const { token } = tokenData;
    
    // 2. Exchange for session token
    const sessionRes = await page.request.post(`${BACKEND_URL}/auth/magic/verify`, {
        data: { token }
    });
    const sessionData = await sessionRes.json();
    console.log('Session Token Response:', sessionData);
    const { token: sessionToken } = sessionData;

    await page.goto('/');

    // 3. Attempt connection using a method that supports headers (e.g. fetching the endpoint)
    // Since EventSource doesn't support headers, real agents use a library or a 
    // Proxy. Here we test the endpoint's response to the token.
    const authStatus = await page.evaluate(async ({ url, st }) => {
        const res = await fetch(`${url}/mcp`, {
            headers: { 'Authorization': `Bearer ${st}` }
        });
        return res.status;
    }, { url: BACKEND_URL, st: sessionToken });

    console.log('MCP Auth Status:', authStatus);

    // 200 OK means the authMiddleware allowed the connection
    expect(authStatus).toBe(200);
  });

});
