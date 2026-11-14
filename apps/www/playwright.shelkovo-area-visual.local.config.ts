import { createVisualFixturePlaywrightConfig } from './tests/config/playwright-visual-fixture';

export default createVisualFixturePlaywrightConfig({
  testMatch: 'shelkovo-area.visual.local.spec.ts',
  port: 4337,
  viewport: { width: 768, height: 200 },
  command: 'pnpm run test:visual:shelkovo-area:serve',
  testTimeout: 60_000,
  serverTimeout: 120_000
});
