import { createRequire } from 'node:module';

import firaSansUnicode from '@fontsource/fira-sans/unicode.json' with { type: 'json' };
import ptSerifUnicode from '@fontsource/pt-serif/unicode.json' with { type: 'json' };
import { fontProviders } from 'astro/config';
import { z } from 'astro/zod';

import { mediaFontFamilies, wwwFontFamilies } from './src/font-families';
import type { LocalFontFamily } from './src/font-types';

const require = createRequire(import.meta.url);
const unicodeRangesSchema = z.record(z.string(), z.string().min(1));
const sources = {
  '--font-fira-sans': {
    id: 'fira-sans',
    unicodeRanges: unicodeRangesSchema.parse(firaSansUnicode)
  },
  '--font-pt-serif': {
    id: 'pt-serif',
    unicodeRanges: unicodeRangesSchema.parse(ptSerifUnicode)
  }
};

const localFonts = (families: typeof wwwFontFamilies | typeof mediaFontFamilies) =>
  families.map((family) => {
    const source = sources[family.cssVariable];
    // Match Fontsource's subset/style/weight order, including fallback metric selection.
    const variants = family.subsets.flatMap((subset) => {
      const unicodeRange = z.string().min(1).parse(source.unicodeRanges[subset]);
      return family.styles.flatMap((style) =>
        family.weights.map(
          (weight) =>
            ({
              weight,
              style,
              unicodeRange: [unicodeRange],
              src: [
                require.resolve(
                  `@fontsource/${source.id}/files/${source.id}-${subset}-${weight}-${style}.woff2`
                )
              ]
            }) satisfies LocalFontFamily['options']['variants'][number]
        )
      );
    });
    const [first, ...rest] = variants;
    if (!first) {
      throw new Error(`No local font variants: ${family.name}`);
    }

    return {
      ...family,
      provider: fontProviders.local(),
      options: { variants: [first, ...rest] }
    } satisfies LocalFontFamily;
  });

export const wwwFonts = localFonts(wwwFontFamilies);
export const mediaFonts = localFonts(mediaFontFamilies);
