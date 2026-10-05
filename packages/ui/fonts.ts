import { fontProviders } from 'astro/config';

import { mediaFontFamilies, wwwFontFamilies } from './src/font-families';

export { fontPreloads } from './src/font-families';

export const wwwFonts = wwwFontFamilies.map((family) => ({
  ...family,
  provider: fontProviders.fontsource()
}));

export const mediaFonts = mediaFontFamilies.map((family) => ({
  ...family,
  provider: fontProviders.fontsource()
}));
