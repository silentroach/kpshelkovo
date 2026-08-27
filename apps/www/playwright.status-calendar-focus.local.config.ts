import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';

const port = 14332;
const baseURL = `http://127.0.0.1:${String(port)}`;
const cwd = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  testDir: './tests',
  testMatch: 'status-calendar-focus.browser.spec.ts',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  timeout: 120_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL,
    browserName: 'chromium',
    headless: true,
    colorScheme: 'light',
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: 'pnpm run test:browser:status-calendar-focus:serve',
    cwd,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
