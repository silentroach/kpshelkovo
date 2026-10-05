import { describe, expect, it } from 'vitest';

import { assertFontData } from '../../../../../packages/ui/src/font-data';
import { wwwFontFamilies } from '../../../../../packages/ui/src/font-families';

const resolvedFonts = () =>
  Object.fromEntries(
    wwwFontFamilies.map((family) => [
      family.cssVariable,
      family.weights.flatMap((weight) =>
        family.styles.flatMap((style) =>
          family.subsets.map((subset) => ({
            weight: String(weight),
            style,
            subset,
            src: [{ url: '/static/fonts/font.woff2', format: 'woff2' }]
          }))
        )
      )
    ])
  );

describe('required font faces', () => {
  it('accepts the complete matrix without resolving fonts over the network', () => {
    expect(() => assertFontData(resolvedFonts(), wwwFontFamilies)).not.toThrow();
  });

  it.each(['empty family', 'missing subset'])(
    'rejects %s instead of publishing fallback-only pages',
    (failure) => {
      const data = resolvedFonts();
      const faces = data['--font-fira-sans'] ?? [];
      data['--font-fira-sans'] =
        failure === 'empty family'
          ? []
          : faces.filter((face) => !(face.weight === '400' && face.subset === 'latin'));

      expect(() => assertFontData(data, wwwFontFamilies)).toThrowErrorMatchingInlineSnapshot(
        `[Error: Missing required font face: Fira Sans 400 normal latin]`
      );
    }
  );
});
