import { fileURLToPath } from 'node:url';

import { createVisualFixtureAstroConfig } from '../config/astro-visual-fixture';

const config = createVisualFixtureAstroConfig();
config.site = 'https://kpshelkovo.online';
config.server = { host: '127.0.0.1', port: 14336 };
config.vite = {
  ...config.vite,
  resolve: {
    alias: {
      '@/lib/status/load': fileURLToPath(new URL('./src/status-fixture.ts', import.meta.url)),
      '@': fileURLToPath(new URL('../../src', import.meta.url))
    }
  },
  server: { ...config.vite?.server, strictPort: true }
};
export default config;
