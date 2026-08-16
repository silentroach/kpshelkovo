import { z } from 'astro/zod';
import type { KbPageFlag } from './types';

const KB_PAGE_FLAGS = [
  'exclude-from-site-search',
  'noindex',
] as const satisfies readonly KbPageFlag[];

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

export const RawKbPageSchema = z
  .object({
    title: z.string().trim(),
    flags: RawKbPageFlagsSchema,
    seo: RawKbPageSeoSchema.optional(),
  })
  .strict();

export type RawKbPage = z.output<typeof RawKbPageSchema>;
