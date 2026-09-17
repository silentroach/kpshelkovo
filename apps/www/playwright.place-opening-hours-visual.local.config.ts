import { createVisualFixturePlaywrightConfig } from './tests/config/playwright-visual-fixture';

export default createVisualFixturePlaywrightConfig({
  testMatch: 'place-opening-hours-visual.spec.ts',
  port: 4335,
  viewport: { width: 1440, height: 1100 },
  command: 'pnpm run test:visual:place-opening-hours:serve',
  testTimeout: 60_000,
  serverTimeout: 120_000
});
