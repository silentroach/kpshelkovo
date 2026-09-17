import { fileURLToPath } from 'node:url';

import { createVisualFixtureAstroConfig } from '../config/astro-visual-fixture';

const config = createVisualFixtureAstroConfig();

export default {
  ...config,
  site: 'https://kpshelkovo.online',
  vite: {
    ...config.vite,
    envDir: fileURLToPath(new URL('../../../../', import.meta.url))
  }
};
