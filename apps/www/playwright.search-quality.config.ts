import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';

const port = 4330;
const baseURL = `http://127.0.0.1:${String(port)}`;
const cwd = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  testDir: './tests',
  testMatch: 'search-quality.spec.ts',
  snapshotPathTemplate: '{testDir}/search-quality.snapshots/{arg}{ext}',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  timeout: 90_000,
  expect: {
    timeout: 15_000,
  },
  use: {
    baseURL,
    browserName: 'chromium',
    headless: true,
    viewport: {
      width: 1280,
      height: 800,
    },
    colorScheme: 'light',
  },
  webServer: {
    command: 'pnpm run test:search-quality:serve',
    cwd,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
