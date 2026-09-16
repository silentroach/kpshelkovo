import { z } from 'astro/zod';

import { contentDateSchema, contentDateTimeSchema } from '@/lib/content-date';

const text = z.string().trim().min(1);
const participant = z.union([
  text,
  z.object({ name: text, type: z.enum(['organization', 'person']).optional() })
]);

export const EventIdSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'event ID must be a lowercase slug');
export const EventBodySchema = text;
export const EventSlugSchema = EventIdSchema.refine(
  (slug) => slug === slug.trim() && !/^\d+$/.test(slug) && slug !== 'list',
  'event slug must not be numeric or reserved "list"'
);
export const EventReferenceKeySchema = z
  .string()
  .regex(
    /^\d{4}\/(?:0[1-9]|1[0-2])\/[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'event reference must use YYYY/MM/slug'
  )
  .refine((key) => EventSlugSchema.safeParse(key.split('/')[2]).success, 'invalid event slug');

export const EventRoutesSchema = z
  .array(
    z.object({
      id: EventIdSchema,
      url: z.string()
    })
  )
  .superRefine((events, ctx) => {
    const ids = new Set<string>();
    const paths = new Map<string, string>();
    events.forEach((event, index) => {
      if (ids.has(event.id)) {
        ctx.addIssue({
          code: 'custom',
          path: [index, 'id'],
          message: `duplicate event ID "${event.id}"`
        });
      }
      ids.add(event.id);
      const owner = paths.get(event.url);
      if (owner) {
        ctx.addIssue({
          code: 'custom',
          path: [index, 'url'],
          message: `event URL collision "${event.url}" between "${owner}" and "${event.id}"`
        });
      }
      paths.set(event.url, event.id);
    });
  });

export const RawEventSchema = z
  .object({
    slug: EventSlugSchema,
    title: text,
    category: z.enum([
      'sport',
      'workshops',
      'games',
      'celebrations',
      'meetings',
      'community',
      'exhibitions',
      'other'
    ]),
    starts_at: contentDateSchema('starts_at'),
    ends_at: contentDateTimeSchema('ends_at').optional(),
    through: contentDateSchema('through')
      .refine((date) => !date.hasTime, 'through must be a date without time')
      .optional(),
    status: z.enum(['announced', 'conditional', 'cancelled']).default('announced'),
    source_url: z.url({ protocol: /^https?$/ }),
    price: text.optional(),
    audience: text.optional(),
    location: text.optional(),
    coordinates: z
      .object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })
      .optional(),
    organizer: participant.optional(),
    performer: z.array(participant).min(1).optional(),
    legacy_uid: text.regex(/^[^\r\n]+$/, 'legacy_uid must be a single line').optional()
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.ends_at && (!data.starts_at.hasTime || data.ends_at.at <= data.starts_at.at)) {
      ctx.addIssue({
        code: 'custom',
        path: ['ends_at'],
        message: 'ends_at requires a timed start and must be later than starts_at'
      });
    }
    if (
      data.through &&
      (data.starts_at.hasTime || data.ends_at || data.through.at <= data.starts_at.at)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['through'],
        message: 'through must be later than a date-only starts_at and cannot accompany ends_at'
      });
    }
  });

export type RawEvent = z.output<typeof RawEventSchema>;
export type RawEventInput = z.input<typeof RawEventSchema>;
