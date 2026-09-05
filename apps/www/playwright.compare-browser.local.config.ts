import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';

const port = 4330;
const baseURL = `http://127.0.0.1:${String(port)}`;
const cwd = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  testDir: './tests',
  testMatch: [
    'compare-controls.browser.spec.ts',
    'sticky-table-lifecycle.browser.spec.ts',
  ],
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
    deviceScaleFactor: 2,
    colorScheme: 'light',
  },
  webServer: {
    command:
      'PUBLIC_YANDEX_MAPS_API_KEY=browser-test pnpm run test:browser:compare:serve',
    cwd,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
