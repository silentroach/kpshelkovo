import { createVisualFixturePlaywrightConfig } from './tests/config/playwright-visual-fixture';

export default createVisualFixturePlaywrightConfig({
  testMatch: 'news-event-card-visual.spec.ts',
  port: 4327,
  viewport: {
    width: 1440,
    height: 1100,
  },
  command: 'pnpm run test:visual:news-event:serve',
  testTimeout: 60_000,
  serverTimeout: 120_000,
});
