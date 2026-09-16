import type { APIContext } from 'astro';
import { describe, expect, it, vi } from 'vitest';

import {
  GET as dayGet,
  getStaticPaths as dayPaths
} from '@/pages/events/[year]/[month]/[day]/index.md';
import {
  GET as monthGet,
  getStaticPaths as monthPaths
} from '@/pages/events/[year]/[month]/index.md';
import {
  GET as listGet,
  getStaticPaths as listPaths
} from '@/pages/events/[year]/[month]/list/index.md';
import { GET as feedGet } from '@/pages/events/events.json';
import { GET as rootGet } from '@/pages/events/index.md';
import { GET as schemaGet } from '@/pages/events/schemas/events.schema.json';

import { loadEventsBuildData } from '../build';
import { buildEventCalendar } from '../calendar-projection';
import { loadEventsData } from '../load';
import { mapRawEvent } from '../mapper';
import { EventsPublicPayloadSchema } from '../public-schema';
import { RawEventSchema } from '../raw-schema';

vi.mock('../load', () => ({ loadEventsData: vi.fn() }));
vi.mock('@/lib/news/load', () => ({
  loadNewsData: async () => ({
    articles: [{ url: '/news/2026/12/announcement/', events: [{ id: 'period' }] }]
  })
}));

const record = mapRawEvent({
  id: 'period',
  body: 'Описание.',
  data: RawEventSchema.parse({
    title: 'Период',
    category: 'other',
    starts_at: '30.12.2026',
    through: '03.01.2027',
    status: 'cancelled',
    source_url: 'https://example.com/source'
  })
});
const data = {
  events: [record],
  byId: new Map([[record.id, record]]),
  calendar: buildEventCalendar([record])
};
vi.mocked(loadEventsData).mockResolvedValue(data);
const context = (params: Record<string, string> = {}): APIContext => ({ params }) as APIContext;

describe('event public routes', () => {
  it('generates only projected months/days and shares month/list content and root selection', async () => {
    expect(await dayPaths()).toHaveLength(5);
    expect(await monthPaths()).toMatchInlineSnapshot(`
      [
        {
          "params": {
            "month": "12",
            "year": "2026",
          },
        },
        {
          "params": {
            "month": "01",
            "year": "2027",
          },
        },
      ]
    `);
    expect(await listPaths()).toEqual(await monthPaths());
    const params = context({ year: '2027', month: '01' });
    expect(await (await monthGet(params)).text()).toBe(await (await listGet(params)).text());
    const firstBuild = await loadEventsBuildData();
    expect(await loadEventsBuildData()).toBe(firstBuild);
    expect(await (await rootGet(context())).text()).toContain(firstBuild.startMonth!.id);
    const day = await dayGet(context({ year: '2027', month: '01', day: '03' }));
    expect(day.headers.get('content-type')).toBe('text/markdown; charset=utf-8');
    expect(await day.text()).toContain(record.sourceUrl);
    await expect(dayGet(context({ year: '2027', month: '01', day: '04' }))).rejects.toThrow(
      'not found'
    );
  });

  it('serves compact full JSON with backlinks and its Zod-derived schema', async () => {
    const feed = await feedGet(context());
    const text = await feed.text();
    const payload = EventsPublicPayloadSchema.parse(JSON.parse(text));
    expect(payload.events).toHaveLength(1);
    expect(payload.events[0]?.newsUrls).toEqual([
      'https://kpshelkovo.online/news/2026/12/announcement/'
    ]);
    expect(text).toBe(JSON.stringify(JSON.parse(text)));
    expect(feed.headers.get('link')).toContain('/events/schemas/events.schema.json');
    const schema = await schemaGet(context());
    expect(schema.headers.get('content-type')).toBe('application/schema+json; charset=utf-8');
    expect(await schema.json()).toHaveProperty(
      '$schema',
      'https://json-schema.org/draft/2020-12/schema'
    );
  });
});
