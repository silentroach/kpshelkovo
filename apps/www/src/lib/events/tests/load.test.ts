import { describe, expect, it, vi } from 'vitest';

import { RawEventSchema } from '../raw-schema';
import { eventSourceId } from '../source';
import type { EventEntry } from '../types';

const getCollection = vi.hoisted(() => vi.fn());
vi.mock('astro:content', () => ({ getCollection }));
vi.mock('@/lib/mentions/registry', () => ({ loadSiteMentionRegistry: async () => new Map() }));
vi.mock('@/lib/places/load', () => ({ loadPlacesData: async () => ({ bySlug: new Map() }) }));

const entry = (month: string): EventEntry => {
  const input = {
    slug: 'meeting',
    title: 'Встреча',
    category: 'meetings',
    starts_at: `01.${month}.2026 00:30`,
    source_url: 'https://example.com/source'
  };
  return {
    id: eventSourceId(`2026/${month}/stable-id.md`, input, () => 'Описание'),
    data: RawEventSchema.parse(input),
    body: 'Описание'
  };
};

const load = async (entries: readonly EventEntry[]) => {
  vi.resetModules();
  getCollection.mockResolvedValue(entries);
  return (await import('../load')).loadEventsData();
};

describe('event collection loading', () => {
  it('keeps the public identity when the source moves to another month', async () => {
    const original = await load([entry('09')]);
    const moved = await load([entry('10')]);
    expect(
      [original, moved].map(({ byId }) => {
        const event = byId.get('stable-id');
        return { id: event?.id, url: event?.url, ics: event?.icsUrl, uid: event?.calendarUid };
      })
    ).toMatchInlineSnapshot(`
      [
        {
          "ics": "/events/calendar/stable-id.ics",
          "id": "stable-id",
          "uid": "event-stable-id@kpshelkovo.online",
          "url": "/events/2026/09/meeting/",
        },
        {
          "ics": "/events/calendar/stable-id.ics",
          "id": "stable-id",
          "uid": "event-stable-id@kpshelkovo.online",
          "url": "/events/2026/10/meeting/",
        },
      ]
    `);
  });

  it('rejects a duplicate stable ID across different month folders', async () => {
    await expect(load([entry('09'), entry('10')])).rejects.toThrow('duplicate event ID');
  });
});
