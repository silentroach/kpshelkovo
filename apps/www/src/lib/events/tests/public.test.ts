import { describe, expect, it } from 'vitest';

import { buildEventCalendar } from '../calendar-projection';
import { mapRawEvent } from '../mapper';
import {
  buildEventsDayMarkdown,
  buildEventsMonthMarkdown,
  buildEventsRootMarkdown
} from '../markdown';
import { buildEventNewsLinks, buildEventsPublicPayload, toEventPublic } from '../public';
import { buildEventsPublicJsonSchema, EventsPublicPayloadSchema } from '../public-schema';
import { RawEventSchema } from '../raw-schema';
import type { RawEventInput } from '../raw-schema';
import { buildEventJsonLd } from '../seo';

const site = 'https://kpshelkovo.online';
const event = (id: string, starts: string, extra: Partial<RawEventInput> = {}) =>
  mapRawEvent({
    id,
    body: 'Полное описание. [Запись](https://example.com/register).\n\nНужна группа от пяти человек.',
    data: RawEventSchema.parse({
      title: id,
      category: 'workshops',
      starts_at: starts,
      source_url: 'https://example.com/source',
      ...extra
    })
  });

describe('event public representations', () => {
  it('publishes one full record per event with source, news backlinks and actual export availability', () => {
    const records = [
      event('period', '30.12.2026', { through: '03.01.2027', status: 'cancelled' }),
      event('date', '01.01.2027', { status: 'conditional', price: '600 / 800 / 1000 ₽' }),
      event('timed', '01.01.2027 21:00'),
      event('night', '01.01.2027 21:00', { ends_at: '02.01.2027 02:00' })
    ];
    const links = buildEventNewsLinks([
      { url: '/news/2026/12/announcement/', eventIds: ['period', 'period', 'date'] },
      { url: '/news/2026/12/cancellation/', eventIds: ['period'] }
    ]);
    const payload = EventsPublicPayloadSchema.parse(
      JSON.parse(JSON.stringify(buildEventsPublicPayload(records, site, links)))
    );
    expect(
      payload.events.map((item) => ({
        id: item.id,
        precision: item.timePrecision,
        start: item.startsAt,
        end: item.timePrecision === 'datetime' ? item.endsAt : item.through,
        status: item.status,
        ics: item.icsUrl,
        news: item.newsUrls
      }))
    ).toMatchInlineSnapshot(`
      [
        {
          "end": "2027-01-03",
          "ics": "https://kpshelkovo.online/events/calendar/period.ics",
          "id": "period",
          "news": [
            "https://kpshelkovo.online/news/2026/12/announcement/",
            "https://kpshelkovo.online/news/2026/12/cancellation/",
          ],
          "precision": "date",
          "start": "2026-12-30",
          "status": "cancelled",
        },
        {
          "end": undefined,
          "ics": undefined,
          "id": "date",
          "news": [
            "https://kpshelkovo.online/news/2026/12/announcement/",
          ],
          "precision": "date",
          "start": "2027-01-01",
          "status": "conditional",
        },
        {
          "end": undefined,
          "ics": "https://kpshelkovo.online/events/calendar/timed.ics",
          "id": "timed",
          "news": [],
          "precision": "datetime",
          "start": "2027-01-01T21:00:00+03:00",
          "status": "announced",
        },
        {
          "end": "2027-01-02T02:00:00+03:00",
          "ics": "https://kpshelkovo.online/events/calendar/night.ics",
          "id": "night",
          "news": [],
          "precision": "datetime",
          "start": "2027-01-01T21:00:00+03:00",
          "status": "announced",
        },
      ]
    `);
    expect(
      payload.events.every(
        (item) => item.sourceUrl === records[0]?.sourceUrl && item.bodyMarkdown === records[0]?.body
      )
    ).toBe(true);
    expect(payload.events[1]?.price).toBe('600 / 800 / 1000 ₽');
    expect(buildEventsPublicJsonSchema(site).$id).toBe(`${site}/events/schemas/events.schema.json`);
  });

  it('does not manufacture an ICS URL from precision or expose domain-only values', () => {
    const timed = event('timed', '01.01.2027 21:00');
    const published = toEventPublic({ ...timed, icsUrl: undefined }, site);
    expect(published.icsUrl).toBeUndefined();
    expect(Object.keys(JSON.parse(JSON.stringify(published)))).toMatchInlineSnapshot(`
      [
        "id",
        "url",
        "title",
        "category",
        "status",
        "sourceUrl",
        "bodyMarkdown",
        "newsUrls",
        "timePrecision",
        "startsAt",
      ]
    `);
  });

  it('retains all known optional card details in JSON', () => {
    const record = event('details', '01.01.2027', {
      audience: '12+',
      location: 'Площадка',
      coordinates: { lat: -45, lng: 170 },
      organizer: 'Организатор',
      performer: [{ name: 'Исполнитель', type: 'person' }]
    });
    const item = toEventPublic(record, site);
    expect({
      audience: item.audience,
      location: item.location,
      coordinates: item.coordinates,
      organizer: item.organizer,
      performer: item.performer
    }).toMatchInlineSnapshot(`
        {
          "audience": "12+",
          "coordinates": {
            "lat": -45,
            "lng": 170,
          },
          "location": "Площадка",
          "organizer": {
            "name": "Организатор",
            "type": "organization",
          },
          "performer": [
            {
              "name": "Исполнитель",
              "type": "person",
            },
          ],
        }
      `);
  });

  it('links month and root readers to full day Markdown and preserves the selected month', () => {
    const calendar = buildEventCalendar([event('period', '30.12.2026', { through: '03.01.2027' })]);
    const month = calendar.months[1]!;
    const markdown = buildEventsMonthMarkdown(month, site);
    expect(buildEventsRootMarkdown(month, site)).toBe(markdown);
    for (const path of [
      '2027/01/01/index.md',
      '2027/01/03/index.md',
      'events.json',
      'schemas/events.schema.json'
    ]) {
      expect(markdown).toContain(`${site}/events/${path}`);
    }
    expect(buildEventsRootMarkdown(undefined, site)).not.toContain('/events/202');
    expect(markdown).not.toMatch(/src\/|\.\.\//);
  });

  it('links monthly event titles to the first visible day anchor, retaining the primary URL in full cards', () => {
    const period = event('period', '30.12.2026', { through: '03.01.2027' });
    const calendar = buildEventCalendar([period]);
    for (const [index, path] of ['2026/12/30/', '2027/01/01/'].entries()) {
      const month = calendar.months[index]!;
      const markdown = buildEventsMonthMarkdown(month, site);
      expect(markdown).toContain(`[period](${site}/events/${path}#period)`);
      expect(buildEventsDayMarkdown(month.days[0]!, site)).toContain(`${site}${period.url}`);
    }
    expect(buildEventsMonthMarkdown(calendar.months[1]!, site)).not.toContain(
      '/events/2026/12/30/'
    );
  });

  it('keeps full body, period, state and source on each projected day without offering cancelled ICS', () => {
    const period = event('period', '30.12.2026', { through: '03.01.2027', status: 'cancelled' });
    const calendar = buildEventCalendar([period]);
    for (const day of calendar.days) {
      const markdown = buildEventsDayMarkdown(day, site);
      for (const value of [
        '2026-12-30',
        '2027-01-03',
        'Отменено',
        period.sourceUrl,
        'https://example.com/register',
        'Нужна группа от пяти человек.',
        `${site}${period.url}`
      ]) {
        expect(markdown).toContain(value);
      }
      expect(markdown).not.toContain('.ics');
    }
  });

  it('does not invent hours for date-only Markdown and publishes conditional timed export', () => {
    const records = [
      event('date', '01.01.2027'),
      event('timed', '01.01.2027 18:00', { status: 'conditional' })
    ];
    const markdown = buildEventsDayMarkdown(buildEventCalendar(records).days[0]!, site);
    for (const value of ['время уточняется', 'При наборе группы', '/events/calendar/timed.ics'])
      expect(markdown).toContain(value);
    expect(markdown).not.toContain('/events/calendar/date.ics');
    expect(markdown).not.toContain('20:00');
  });
});

describe('shared Event JSON-LD', () => {
  it('keeps canonical identity across projected days and inclusive date-only end', () => {
    const period = event('period', '30.12.2026', { through: '03.01.2027', status: 'cancelled' });
    const docs = buildEventCalendar([period]).days.map((day) =>
      buildEventJsonLd(day.events[0]!, site)
    );
    expect(new Set(docs.map((doc) => doc['@id'])).size).toBe(1);
    expect({
      id: docs[0]?.['@id'],
      start: docs[0]?.startDate,
      end: docs[0]?.endDate,
      status: docs[0]?.eventStatus
    }).toMatchInlineSnapshot(`
      {
        "end": "2027-01-03",
        "id": "https://kpshelkovo.online/events/2026/12/30/#period",
        "start": "2026-12-30",
        "status": "https://schema.org/EventCancelled",
      }
    `);
  });

  it('keeps conditional uncertainty and never exports the ICS fallback into JSON-LD', () => {
    const record = event('conditional', '01.01.2027 18:00', {
      status: 'conditional',
      price: '600 / 800 / 1000 ₽'
    });
    const doc = JSON.parse(JSON.stringify(buildEventJsonLd(record, site)));
    expect({
      status: doc.eventStatus,
      end: doc.endDate,
      offers: doc.offers,
      location: doc.location
    }).toMatchInlineSnapshot(`
      {
        "end": undefined,
        "location": undefined,
        "offers": undefined,
        "status": undefined,
      }
    `);
    expect(doc.description).toContain('При наборе группы.');
    expect(doc.description).toContain('Нужна группа от пяти человек.');
    expect(buildEventJsonLd(event('date', '01.01.2027'), site).startDate).toBe('2027-01-01');
  });
});
