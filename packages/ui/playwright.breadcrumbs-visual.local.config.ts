import { fileURLToPath } from 'node:url';

import { defineConfig } from '@playwright/test';

const port = 4325;
const baseURL = `http://127.0.0.1:${String(port)}`;
const cwd = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  testDir: './tests',
  testMatch: 'breadcrumbs.visual.local.spec.ts',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  timeout: 60_000,
  expect: {
    timeout: 10_000
  },
  use: {
    baseURL,
    browserName: 'chromium',
    headless: true,
    viewport: {
      width: 1440,
      height: 960
    },
    deviceScaleFactor: 2,
    colorScheme: 'light'
  },
  webServer: {
    command: 'pnpm run test:visual:breadcrumbs:serve',
    cwd,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
