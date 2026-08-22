import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';

const port = 4331;
const baseURL = `http://127.0.0.1:${String(port)}`;
const cwd = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  testDir: './tests',
  testMatch: 'regulation-tooltip.spec.ts',
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
    viewport: {
      width: 390,
      height: 844,
    },
    colorScheme: 'light',
  },
  webServer: {
    command: 'pnpm run test:regulation-tooltip:serve',
    cwd,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
