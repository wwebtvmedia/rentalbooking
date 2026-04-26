import { test, expect } from '@playwright/test';

test.describe('Secure Agent Tunnel (MCP)', () => {

  test('MCP connection should fail without token', async ({ page }) => {
    await page.goto('https://www.bestflats.vip');

    const mcpResult = await page.evaluate(async () => {
      return new Promise((resolve) => {
        // EventSource doesn't support headers natively, 
        // so it will send a request without the Authorization header.
        const es = new EventSource('https://api.bestflats.vip/mcp');
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
    });

    expect(mcpResult).toBe('failed');
  });

  test('MCP connection should succeed with valid agent token', async ({ page }) => {
    // 1. Get an agent token (using the test-mode endpoint)
    const tokenRes = await page.request.post('https://api.bestflats.vip/auth/magic', {
        data: { email: 'agent-verify@bestflats.vip', role: 'admin' }
    });
    const { token } = await tokenRes.json();
    
    // 2. Exchange for session token
    const sessionRes = await page.request.post('https://api.bestflats.vip/auth/magic/verify', {
        data: { token }
    });
    const { token: sessionToken } = await sessionRes.json();

    await page.goto('https://www.bestflats.vip');

    // 3. Attempt connection using a method that supports headers (e.g. fetching the endpoint)
    // Since EventSource doesn't support headers, real agents use a library or a 
    // Proxy. Here we test the endpoint's response to the token.
    const authStatus = await page.evaluate(async (st) => {
        const res = await fetch('https://api.bestflats.vip/mcp', {
            headers: { 'Authorization': `Bearer ${st}` }
        });
        return res.status;
    }, sessionToken);

    // 200 OK means the authMiddleware allowed the connection
    expect(authStatus).toBe(200);
  });

});
