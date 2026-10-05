import { z } from 'astro/zod';

import type { mediaFontFamilies, wwwFontFamilies } from './font-families';

const fontDataSchema = z.record(
  z.string(),
  z.array(
    z.object({
      weight: z.string(),
      style: z.string(),
      src: z.tuple([z.object({ url: z.string().min(1), format: z.literal('woff2') })])
    })
  )
);

// The local provider omits subset labels; each configured subset has its own WOFF2.
export const assertFontData = (
  data: unknown,
  families: typeof wwwFontFamilies | typeof mediaFontFamilies
): void => {
  const resolved = fontDataSchema.parse(data);

  for (const family of families) {
    const faces = resolved[family.cssVariable] ?? [];

    for (const weight of family.weights) {
      for (const style of family.styles) {
        const matchingFaces = faces.filter(
          (face) => face.weight === String(weight) && face.style === style
        );
        const sources = new Set(matchingFaces.map((face) => face.src[0].url));
        if (
          matchingFaces.length !== family.subsets.length ||
          sources.size !== family.subsets.length
        ) {
          throw new Error(
            `Incomplete font faces: ${family.name} ${weight} ${style} (expected ${family.subsets.length} distinct subsets)`
          );
        }
      }
    }
  }
};
