import { z } from 'astro/zod';

import { parseContentDate } from '@/lib/content-date';
import { trimMarkdown } from '@/lib/content-source';

const YearSchema = z.string().regex(/^\d{4}$/);
const MonthSchema = z.string().regex(/^(0[1-9]|1[0-2])$/);
const SlugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const IncidentStartSchema = z.object({ started_at: z.unknown() });

function failStatus(entry: string, reason: string): never {
  throw new Error(`status incident path "${entry}" ${reason}`);
}

export function statusSourceId(entry: string, data: unknown, readBody: () => string): string {
  const id = trimMarkdown(entry);
  const parts = id.split('/');

  if (parts.length !== 3) {
    failStatus(entry, 'must resolve to YYYY/MM/[slug]');
  }

  const [year, month, slug] = parts;

  if (
    !YearSchema.safeParse(year).success ||
    !MonthSchema.safeParse(month).success ||
    slug.length === 0
  ) {
    failStatus(entry, 'must use YYYY/MM/[slug] with numeric year and month');
  }

  if (!SlugSchema.safeParse(slug).success) {
    failStatus(entry, 'slug must use lower-case Latin letters, digits, and hyphen');
  }

  const input = IncidentStartSchema.safeParse(data);
  const started = input.success ? parseContentDate(input.data.started_at) : undefined;

  if (started && (started.year !== year || started.month !== month)) {
    failStatus(entry, 'must match the frontmatter started_at year and month');
  }

  const body = readBody();

  if (body.length > 0 && body.trim().length === 0) {
    failStatus(entry, 'body must not be blank');
  }

  return id;
}
