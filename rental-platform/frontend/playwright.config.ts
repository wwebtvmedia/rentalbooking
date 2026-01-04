import { defineConfig, devices } from '@playwright/test';

const port = process.env.PORT || '3000';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  use: {
    baseURL: `http://localhost:${port}`,
    headless: true,
    viewport: { width: 1280, height: 720 },
  },
  webServer: {
    // Automatically starts the Next.js dev server before running tests
    command: 'npm run dev',
    port: Number(port),
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ]
});
