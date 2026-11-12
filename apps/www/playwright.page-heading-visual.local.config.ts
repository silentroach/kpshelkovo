import { createVisualFixturePlaywrightConfig } from './tests/config/playwright-visual-fixture';

export default createVisualFixturePlaywrightConfig({
  testMatch: 'page-heading.visual.local.spec.ts',
  port: 4336,
  viewport: { width: 1440, height: 1000 },
  command: 'pnpm run test:visual:page-heading:serve',
  testTimeout: 60_000,
  serverTimeout: 120_000
});
