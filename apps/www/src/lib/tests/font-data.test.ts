import { describe, expect, it } from 'vitest';

import { assertFontData } from '../../../../../packages/ui/src/font-data';
import { mediaFontFamilies, wwwFontFamilies } from '../../../../../packages/ui/src/font-families';

const resolvedFonts = (
  families: typeof wwwFontFamilies | typeof mediaFontFamilies = wwwFontFamilies
) =>
  Object.fromEntries(
    families.map((family) => [
      family.cssVariable,
      family.weights.flatMap((weight) =>
        family.styles.flatMap((style) =>
          family.subsets.map((subset) => ({
            weight: String(weight),
            style,
            src: [
              {
                url: `/static/fonts/${family.cssVariable}-${subset}-${weight}.woff2`,
                format: 'woff2'
              }
            ]
          }))
        )
      )
    ])
  );

describe('required font faces', () => {
  it.each([
    { host: 'www', families: wwwFontFamilies },
    { host: 'media', families: mediaFontFamilies }
  ])('accepts complete $host faces without subset labels', ({ families }) => {
    expect(() => assertFontData(resolvedFonts(families), families)).not.toThrow();
  });

  it.each(['empty family', 'missing subset', 'duplicate subset'])(
    'rejects %s instead of publishing fallback-only pages',
    (failure) => {
      const data = resolvedFonts();
      const faces = data['--font-fira-sans'] ?? [];
      if (failure === 'empty family') {
        data['--font-fira-sans'] = [];
      } else if (failure === 'missing subset') {
        faces.shift();
      } else {
        faces[0] = faces[1]!;
      }

      expect(() => assertFontData(data, wwwFontFamilies)).toThrowErrorMatchingInlineSnapshot(
        `[Error: Incomplete font faces: Fira Sans 400 normal (expected 3 distinct subsets)]`
      );
    }
  );
});
