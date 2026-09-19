import { z } from 'zod';

const text = z.string().min(1);
const url = z.url({ protocol: /^https?$/ });
const date = z.iso.date();
const datetime = z.iso.datetime({ offset: true });
const participant = z.strictObject({ name: text, type: z.enum(['organization', 'person']) });

const fields = {
  id: text,
  url: url.describe('Canonical detail page: /events/YYYY/MM/slug/, using the start month.'),
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
  status: z.enum(['announced', 'conditional', 'cancelled']),
  sourceUrl: url,
  bodyMarkdown: text.describe('Full editorial body, including conditions and registration links.'),
  price: text.optional(),
  audience: text.optional(),
  location: text.optional(),
  placeId: text.optional(),
  placeUrl: url.optional(),
  locationDetails: text.optional(),
  coordinates: z
    .strictObject({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180)
    })
    .optional(),
  organizer: participant.optional(),
  performer: z.array(participant).min(1).readonly().optional(),
  newsUrls: z.array(url).readonly(),
  icsUrl: url
    .optional()
    .describe('Available endpoint, including cancelled events. Absent when no export exists.')
};

export const EventPublicSchema = z.discriminatedUnion('timePrecision', [
  z.strictObject({
    ...fields,
    timePrecision: z.literal('datetime'),
    startsAt: datetime,
    endsAt: datetime.optional()
  }),
  z.strictObject({
    ...fields,
    timePrecision: z.literal('date'),
    startsAt: date,
    through: date.optional().describe('Inclusive last day of an explicitly multi-day event.')
  })
]);

export const EventsPublicPayloadSchema = z.strictObject({
  schemaVersion: z.literal(1),
  events: z.array(EventPublicSchema).readonly()
});

export const buildEventsPublicJsonSchema = (siteUrl: string) => ({
  ...z.toJSONSchema(EventsPublicPayloadSchema, { target: 'draft-2020-12' }),
  $id: new URL('/events/schemas/events.schema.json', siteUrl).href,
  title: 'Events',
  description:
    'Complete editorial event catalogue, one record per event rather than per projected day. Not a complete archive of source channels.'
});
