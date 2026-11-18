import { fileURLToPath } from 'node:url';

import { defineConfig } from '@playwright/test';

const port = 14335;
const baseURL = `http://127.0.0.1:${String(port)}`;

export default defineConfig({
  testDir: './tests',
  testMatch: 'kb-toc.visual.local.spec.ts',
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
    deviceScaleFactor: 2,
    colorScheme: 'light',
    javaScriptEnabled: false
  },
  projects: [
    { name: '' },
    { name: 'firefox-motion', use: { browserName: 'firefox' }, grep: /contents motion/u },
    { name: 'webkit-motion', use: { browserName: 'webkit' }, grep: /contents motion/u }
  ],
  webServer: {
    command: 'pnpm run test:visual:kb-toc:serve',
    cwd: fileURLToPath(new URL('.', import.meta.url)),
    url: baseURL,
    reuseExistingServer: false,
    timeout: 180_000
  }
});
