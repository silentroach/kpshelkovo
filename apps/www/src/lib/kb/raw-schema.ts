import { z } from 'astro/zod';
import { KB_PAGE_FLAGS } from './page-flags';

const RawKbPageFlagsSchema = z
  .array(z.enum(KB_PAGE_FLAGS))
  .default([])
  .refine((flags) => new Set(flags).size === flags.length, {
    message: 'flags must not contain duplicates',
  });

const RawKbPageSeoSchema = z
  .object({
    description: z.string().trim().optional(),
  })
  .strict();

const isKbSourceUrl = (value: string): boolean => {
  if (
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.includes('\\')
  ) {
    return true;
  }

  try {
    const url = new URL(value);

    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
};

const RawKbPageSourceSchema = z
  .object({
    url: z
      .string()
      .trim()
      .min(1, 'sources[].url must not be blank')
      .refine(isKbSourceUrl, {
        message:
          'sources[].url must be an http(s) URL or a root-relative site path',
      }),
    description: z
      .string()
      .trim()
      .min(1, 'sources[].description must not be blank'),
  })
  .strict();

const RawKbPageSourcesSchema = z
  .array(RawKbPageSourceSchema)
  .min(1, 'sources must not be empty')
  .refine(
    (sources) => new Set(sources.map(({ url }) => url)).size === sources.length,
    { message: 'sources must not contain duplicate URLs' },
  );

export const RawKbPageSchema = z
  .object({
    title: z.string().trim(),
    flags: RawKbPageFlagsSchema,
    seo: RawKbPageSeoSchema.optional(),
    sources: RawKbPageSourcesSchema.optional(),
  })
  .strict();

export type RawKbPage = z.output<typeof RawKbPageSchema>;
