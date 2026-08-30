import { createVisualFixturePlaywrightConfig } from './tests/config/playwright-visual-fixture';

export default createVisualFixturePlaywrightConfig({
  testMatch: 'status-timeline.visual.local.spec.ts',
  port: 4324,
  viewport: {
    width: 1440,
    height: 1200,
  },
  command: 'pnpm run test:visual:status:serve',
  testTimeout: 60_000,
  serverTimeout: 120_000,
});
