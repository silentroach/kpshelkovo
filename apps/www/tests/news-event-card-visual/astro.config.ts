import { createVisualFixtureAstroConfig } from '../config/astro-visual-fixture';

const config = createVisualFixtureAstroConfig();
// testPlace builds canonical place URLs through Astro's SITE.
config.site = 'https://kpshelkovo.online';

export default config;
