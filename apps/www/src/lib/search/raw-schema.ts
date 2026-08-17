import { z } from 'astro/zod';

const aliasKey = (value: string): string =>
  value.replace(/\s+/gu, ' ').toLocaleLowerCase('ru');

export const RawSearchAliasesSchema = z
  .array(z.string().trim().min(1))
  .min(1)
  .refine(
    (aliases) => new Set(aliases.map(aliasKey)).size === aliases.length,
    'search_aliases must not contain duplicates',
  );
