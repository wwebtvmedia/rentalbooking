import { test, expect } from '@playwright/test';

test('page can communicate with the MCP agent via SSE', async ({ page }) => {
  // Navigate to the frontend page to execute the test within the browser context
  await page.goto('http://localhost:3000');

  // Evaluate a script directly in the browser to attempt an SSE connection to the MCP agent
  const mcpConnected = await page.evaluate(async () => {
    return new Promise((resolve) => {
      try {
        // Attempt to connect to the backend's MCP SSE endpoint
        const backendUrl = 'http://localhost:4000/mcp';
        const eventSource = new EventSource(backendUrl);
        
        // Listen for the 'open' event, indicating successful communication
        eventSource.onopen = () => {
          eventSource.close();
          resolve(true); // Successfully connected
        };

        // Listen for the 'endpoint' message which is typically sent by the MCP SDK upon connection
        eventSource.addEventListener('endpoint', (e) => {
          eventSource.close();
          resolve(true);
        });

        // Listen for errors
        eventSource.onerror = () => {
          eventSource.close();
          resolve(false); // Failed to connect
        };
        
        // Timeout after 5 seconds if no connection is established
        setTimeout(() => {
          eventSource.close();
          resolve(false);
        }, 5000);
      } catch (err) {
        resolve(false);
      }
    });
  });

  // Verify that the connection was successful
  expect(mcpConnected).toBe(true);
});
