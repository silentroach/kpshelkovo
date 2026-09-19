import { z } from 'astro/zod';

import { contentDateSchema } from '@/lib/content-date';
import { trimMarkdown } from '@/lib/content-source';

import { EventBodySchema } from './raw-schema';

const EventSourceSchema = z
  .object({
    entry: z
      .string()
      .regex(
        /^\d{4}\/(?:0[1-9]|1[0-2])\/[a-z0-9]+(?:-[a-z0-9]+)*\.md$/,
        'must use YYYY/MM/<event-id>.md'
      ),
    data: z.object({ starts_at: contentDateSchema('starts_at') })
  })
  .refine(
    ({ entry, data }) => entry.startsWith(`${data.starts_at.year}/${data.starts_at.month}/`),
    {
      message: 'must match the frontmatter starts_at year and month',
      path: ['entry']
    }
  );

export const eventSourceId = (entry: string, data: unknown, readBody: () => string): string => {
  const source = EventSourceSchema.safeParse({ entry, data });
  if (!source.success) {
    throw new Error(`event source "${entry}" ${source.error.issues[0].message}`);
  }
  EventBodySchema.parse(readBody());
  return trimMarkdown(entry);
};
