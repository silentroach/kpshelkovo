import { z } from 'astro/zod';

import { trimMarkdown } from '@/lib/content-source';

const SlugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

function failPerson(entry: string, reason: string): never {
  throw new Error(`person profile path "${entry}" ${reason}`);
}

export function personSourceId(entry: string): string {
  if (entry.includes('/')) {
    failPerson(entry, 'must live directly under src/data/people');
  }

  const slug = trimMarkdown(entry);

  if (!SlugSchema.safeParse(slug).success) {
    failPerson(entry, 'slug must use lower-case Latin letters, digits, and hyphen');
  }

  return slug;
}
