import { getCollection } from 'astro:content';

import type { SiteMentionRegistry } from '@/lib/mentions';
import { loadSiteMentionRegistry } from '@/lib/mentions/registry';

import { buildEventCalendar } from './calendar-projection';
import { mapRawEvent } from './mapper';
import type { EventEntry, EventRecord, EventsDataset } from './types';

export const buildEventsDataset = (
  entries: readonly EventEntry[],
  registry?: SiteMentionRegistry
): EventsDataset => {
  const events = entries
    .map((entry) => mapRawEvent(entry, registry))
    .sort((a, b) => a.startsIso.localeCompare(b.startsIso) || a.id.localeCompare(b.id, 'en'));
  const byId = new Map<string, EventRecord>();
  for (const event of events) {
    if (byId.has(event.id)) throw new Error(`duplicate event ID "${event.id}"`);
    byId.set(event.id, event);
  }
  return { events, byId, calendar: buildEventCalendar(events) };
};

let cache: Promise<EventsDataset> | undefined;
export const loadEventsData = (): Promise<EventsDataset> => {
  cache ??= Promise.all([getCollection('events'), loadSiteMentionRegistry()]).then(
    ([entries, registry]) => buildEventsDataset(entries, registry)
  );
  return cache;
};
export const loadEvents = async (): Promise<readonly EventRecord[]> =>
  (await loadEventsData()).events;
export const loadEvent = async (id: string): Promise<EventRecord | undefined> =>
  (await loadEventsData()).byId.get(id);
