import { createVisualFixturePlaywrightConfig } from './tests/config/playwright-visual-fixture';

export default createVisualFixturePlaywrightConfig({
  testMatch: 'sticky-table.visual.local.spec.ts',
  port: 4329,
  viewport: {
    width: 1440,
    height: 900,
  },
  command: 'pnpm run test:visual:sticky-table:serve',
  testTimeout: 120_000,
  serverTimeout: 180_000,
});
