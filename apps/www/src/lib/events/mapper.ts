import { preprocessSiteMarkdown, preprocessSiteMarkdownContent } from '@/lib/markdown/render';
import type { SiteMentionRegistry } from '@/lib/mentions';
import type { Place } from '@/lib/places/types';

import { EventBodySchema, EventIdSchema } from './raw-schema';
import type { RawEvent } from './raw-schema';
import type { EventEntry, EventParticipant, EventRecord } from './types';
import { eventCalendarUrl, eventDetailUrl, eventReferenceKey } from './urls';

const mapParticipant = (value: NonNullable<RawEvent['organizer']>): EventParticipant =>
  typeof value === 'string'
    ? { name: value, type: 'organization' }
    : { name: value.name, type: value.type ?? 'organization' };

export const mapRawEvent = (
  entry: EventEntry,
  registry?: SiteMentionRegistry,
  places?: ReadonlyMap<string, Place>
): EventRecord => {
  const id = EventIdSchema.parse(entry.id);
  const markdown = EventBodySchema.parse(entry.body);
  const body = registry
    ? preprocessSiteMarkdownContent(markdown, `event "${id}" body`, registry)
    : preprocessSiteMarkdown(markdown);
  const data = entry.data;
  const place = data.place ? places?.get(data.place) : undefined;
  if (data.place && !place) {
    throw new Error(`event "${id}" references missing place "${data.place}"`);
  }
  const start = data.starts_at;
  const startsDate = `${start.year}-${start.month}-${start.day}`;
  const through = data.through
    ? `${data.through.year}-${data.through.month}-${data.through.day}`
    : undefined;

  return {
    id,
    eventSlug: data.slug,
    referenceKey: eventReferenceKey(startsDate, data.slug),
    title: data.title,
    category: data.category,
    status: data.status,
    startsDate,
    timePrecision: start.hasTime ? 'datetime' : 'date',
    startsIso: start.hasTime ? start.iso : startsDate,
    startsAt: start.hasTime ? start.at : undefined,
    startsTime: start.time,
    endsAt: data.ends_at?.at,
    endsIso: data.ends_at?.iso,
    endsTime: data.ends_at?.time,
    through,
    sourceUrl: data.source_url,
    body: body.markdown,
    mentions: body.mentions,
    price: data.price,
    audience: data.audience,
    place,
    locationDetails: data.location_details,
    location: place?.name ?? data.location,
    coordinates:
      place?.coordinates ??
      (data.coordinates ? { lat: data.coordinates.lat, lng: data.coordinates.lng } : undefined),
    organizer: data.organizer ? mapParticipant(data.organizer) : undefined,
    performer: data.performer?.map(mapParticipant),
    calendarUid: data.legacy_uid ?? `event-${id}@kpshelkovo.online`,
    url: eventDetailUrl(startsDate, data.slug),
    icsUrl: start.hasTime || through ? eventCalendarUrl(id) : undefined
  };
};
