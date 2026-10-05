import { z } from 'astro/zod';

import type { mediaFontFamilies, wwwFontFamilies } from './font-families';

const fontDataSchema = z.record(
  z.string(),
  z.array(
    z.object({
      weight: z.string(),
      style: z.string(),
      subset: z.string(),
      src: z.array(z.object({ url: z.string().min(1), format: z.literal('woff2') })).min(1)
    })
  )
);

// Astro may swallow metadata errors and resolve an empty or partial font family.
export const assertFontData = (
  data: unknown,
  families: typeof wwwFontFamilies | typeof mediaFontFamilies
): void => {
  const resolved = fontDataSchema.parse(data);

  for (const family of families) {
    const faces = resolved[family.cssVariable] ?? [];

    for (const weight of family.weights) {
      for (const style of family.styles) {
        for (const subset of family.subsets) {
          if (
            !faces.some(
              (face) =>
                face.weight === String(weight) && face.style === style && face.subset === subset
            )
          ) {
            throw new Error(
              `Missing required font face: ${family.name} ${weight} ${style} ${subset}`
            );
          }
        }
      }
    }
  }
};
