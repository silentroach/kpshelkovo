import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';
import type { VisualFixturePlaywrightOptions } from './visual-fixture.types';

const cwd = fileURLToPath(new URL('../..', import.meta.url));

export const createVisualFixturePlaywrightConfig = (
  options: VisualFixturePlaywrightOptions,
) => {
  const baseURL = `http://127.0.0.1:${String(options.port)}`;

  return defineConfig({
    testDir: './tests',
    testMatch: options.testMatch,
    fullyParallel: false,
    workers: 1,
    reporter: 'list',
    timeout: options.testTimeout,
    expect: {
      timeout: 10_000,
    },
    use: {
      baseURL,
      browserName: 'chromium',
      headless: true,
      viewport: options.viewport,
      deviceScaleFactor: 2,
      colorScheme: 'light',
    },
    webServer: {
      command: options.command,
      cwd,
      env: {
        ASTRO_PREVIEW_BACKGROUND: '0',
      },
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: options.serverTimeout,
    },
  });
};
