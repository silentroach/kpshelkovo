import { createVisualFixturePlaywrightConfig } from './tests/config/playwright-visual-fixture';

export default createVisualFixturePlaywrightConfig({
  testMatch: 'kb-adaptive.visual.local.spec.ts',
  port: 4339,
  viewport: { width: 390, height: 900 },
  command: 'pnpm run test:visual:kb-adaptive:serve',
  testTimeout: 60_000,
  serverTimeout: 120_000
});
