import { z } from 'astro/zod';

import { trimMarkdown } from '@/lib/content-source';

const SlugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

function failKbPage(entry: string, reason: string): never {
  throw new Error(`kb page path "${entry}" ${reason}`);
}

export function kbPageSourceId(entry: string): string {
  const sourceId = trimMarkdown(entry);
  const parts = sourceId.split('/');

  if (parts.some((part) => part.length === 0)) {
    failKbPage(entry, 'must not contain empty path segments');
  }

  const routeSegments = parts[parts.length - 1] === 'index' ? parts.slice(0, -1) : parts;

  for (const segment of routeSegments) {
    if (!SlugSchema.safeParse(segment).success) {
      failKbPage(
        entry,
        `segment "${segment}" must use lower-case Latin letters, digits, and hyphen`
      );
    }
  }

  return sourceId;
}
