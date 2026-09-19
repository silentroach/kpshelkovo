import { getCollection } from 'astro:content';

import type { SiteMentionRegistry } from '@/lib/mentions';
import { loadSiteMentionRegistry } from '@/lib/mentions/registry';
import { loadPlacesData } from '@/lib/places/load';
import type { Place } from '@/lib/places/types';

import { buildEventCalendar } from './calendar-projection';
import { mapRawEvent } from './mapper';
import { EventRoutesSchema } from './raw-schema';
import type { EventEntry, EventRecord, EventsDataset } from './types';

export const buildEventsDataset = (
  entries: readonly EventEntry[],
  registry?: SiteMentionRegistry,
  places?: ReadonlyMap<string, Place>
): EventsDataset => {
  const events = entries
    .map((entry) => mapRawEvent(entry, registry, places))
    .sort((a, b) => a.startsIso.localeCompare(b.startsIso) || a.id.localeCompare(b.id, 'en'));
  EventRoutesSchema.parse(events);
  const byId = new Map(events.map((event) => [event.id, event]));
  return { events, byId, calendar: buildEventCalendar(events) };
};

let cache: Promise<EventsDataset> | undefined;
export const loadEventsData = (): Promise<EventsDataset> => {
  cache ??= Promise.all([
    getCollection('events'),
    loadSiteMentionRegistry(),
    loadPlacesData()
  ]).then(([entries, registry, places]) => buildEventsDataset(entries, registry, places.bySlug));
  return cache;
};
export const loadEvents = async (): Promise<readonly EventRecord[]> =>
  (await loadEventsData()).events;
export const loadEvent = async (id: string): Promise<EventRecord | undefined> =>
  (await loadEventsData()).byId.get(id);
