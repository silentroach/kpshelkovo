import { z } from 'astro/zod';

import { trimMarkdown } from '@/lib/content-source';

import { PLACE_SLUG } from './schema';

const PlaceSlugSchema = z.string().regex(PLACE_SLUG);

function failPlace(entry: string, reason: string): never {
  throw new Error(`place path "${entry}" ${reason}`);
}

export function placeSourceId(entry: string): string {
  if (!entry.endsWith('.md') || entry.includes('/')) {
    failPlace(entry, 'must be a Markdown file directly under src/data/places');
  }

  const slug = trimMarkdown(entry);

  if (!PlaceSlugSchema.safeParse(slug).success) {
    failPlace(entry, 'slug must use lower-case Latin letters, digits, and hyphen');
  }

  return slug;
}
