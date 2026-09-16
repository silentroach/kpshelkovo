import { describe, expect, it } from 'vitest';

import { createSiteMentionRegistry } from '@/lib/mentions';
import { createPersonMentionTarget } from '@/lib/people/mentions';

import {
  buildEventCalendar,
  eventMonthNavigation,
  selectEventStartMonth
} from '../calendar-projection';
import { buildEventsDataset } from '../load';
import { mapRawEvent } from '../mapper';
import { RawEventSchema } from '../raw-schema';
import type { RawEventInput } from '../raw-schema';
import { eventUrl } from '../urls';

const entry = (id: string, starts: string, extra: Partial<RawEventInput> = {}) => ({
  id,
  body: 'Registration details and approximate duration.',
  data: RawEventSchema.parse({
    title: id,
    category: 'other',
    starts_at: starts,
    source_url: 'https://example.com/post',
    ...extra
  })
});
const event = (id: string, starts: string, extra: Partial<RawEventInput> = {}) =>
  mapRawEvent(entry(id, starts, extra));

describe('event publication boundary', () => {
  it('prepares body and mention targets through the shared pipeline while retaining the source', () => {
    const registry = createSiteMentionRegistry([
      createPersonMentionTarget('organizer', 'Organizer')
    ]);
    const source = {
      ...entry('mentions', '01.01.2026'),
      body: 'Contact @organizer for registration.'
    };
    const result = buildEventsDataset([source], registry).events[0];
    expect({
      body: result?.body,
      mentions: result?.mentions.map((target) => target.slug),
      source: result?.sourceUrl
    }).toMatchInlineSnapshot(`
      {
        "body": "Contact [Organizer](/people/organizer/) for registration.",
        "mentions": [
          "organizer",
        ],
        "source": "https://example.com/post",
      }
    `);
    expect(() => buildEventsDataset([{ ...source, body: '@missing' }], registry)).toThrow();
  });
  it.each([
    { starts_at: '31.02.2026' },
    { starts_at: '01.01.2026', ends_at: '01.01.2026 18:00' },
    { starts_at: '01.01.2026 18:00', ends_at: '01.01.2026 18:00' },
    { starts_at: '01.01.2026 18:00', ends_at: '01.01.2026 17:00' },
    { through: '31.12.2025' },
    { through: '01.01.2026' },
    { through: '02.01.2026 18:00' },
    { starts_at: '01.01.2026 18:00', through: '02.01.2026' },
    { ends_at: '02.01.2026 18:00', through: '02.01.2026' },
    { source_url: undefined },
    { source_url: 'mailto:someone@example.com' },
    { legacy_uid: 'old@example.com\r\nSTATUS:CANCELLED' },
    { coordinates: { lat: 91, lng: 0 } }
  ])('rejects invalid event facts: %j', (extra) => {
    expect(() => entry('invalid', '01.01.2026', extra)).toThrow();
  });

  it('keeps date-only facts without manufacturing a midnight or calendar export', () => {
    const result = event('date-only', '2026-01-01', {
      price: '600 / 800 / 1000',
      coordinates: { lat: -45, lng: 170 },
      status: 'conditional'
    });
    expect({
      date: result.startsDate,
      iso: result.startsIso,
      at: result.startsAt,
      precision: result.timePrecision,
      end: result.endsAt,
      ics: result.icsUrl,
      coordinates: result.coordinates,
      price: result.price,
      status: result.status
    }).toMatchInlineSnapshot(`
      {
        "at": undefined,
        "coordinates": {
          "lat": -45,
          "lng": 170,
        },
        "date": "2026-01-01",
        "end": undefined,
        "ics": undefined,
        "iso": "2026-01-01",
        "precision": "date",
        "price": "600 / 800 / 1000",
        "status": "conditional",
      }
    `);
  });

  it('accepts coordinate bounds and zero without a local-map restriction', () => {
    for (const coordinates of [
      { lat: 0, lng: 0 },
      { lat: -90, lng: -180 },
      { lat: 90, lng: 180 }
    ]) {
      expect(event('coordinates', '01.01.2026', { coordinates }).coordinates).toEqual(coordinates);
    }
  });

  it('preserves timed facts, participants and migrated UID without inferring an end', () => {
    const result = event('legacy', '01.01.2026 00:30', {
      legacy_uid: 'old@kpshelkovo.online',
      organizer: 'Organizer',
      performer: ['Performer', { name: 'Host', type: 'person' }]
    });
    expect({
      instant: result.startsAt?.toISOString(),
      end: result.endsIso,
      uid: result.calendarUid,
      organizer: result.organizer,
      performer: result.performer
    }).toMatchInlineSnapshot(`
      {
        "end": undefined,
        "instant": "2025-12-31T21:30:00.000Z",
        "organizer": {
          "name": "Organizer",
          "type": "organization",
        },
        "performer": [
          {
            "name": "Performer",
            "type": "organization",
          },
          {
            "name": "Host",
            "type": "person",
          },
        ],
        "uid": "old@kpshelkovo.online",
      }
    `);
  });

  it('rejects blank body, unsafe identifiers and duplicate IDs', () => {
    expect(() => mapRawEvent({ ...entry('empty', '01.01.2026'), body: '  ' })).toThrow();
    expect(() => event('../unsafe', '01.01.2026')).toThrow();
    expect(() =>
      buildEventsDataset([entry('same', '01.01.2026'), entry('same', '02.01.2026')])
    ).toThrow('duplicate event ID');
  });
});

describe('event calendar projection', () => {
  it('compares padded calendar years consistently with parsed dates', () => {
    const calendar = buildEventCalendar([
      event('current', '01.05.0999'),
      event('future', '01.01.1000')
    ]);
    expect(selectEventStartMonth(calendar, new Date('0999-05-15T12:00:00Z'))?.id).toBe('0999-05');
    expect(() => selectEventStartMonth(calendar, new Date('invalid'))).toThrow();
  });
  it('projects inclusive year-crossing periods, orders each day and deduplicates monthly lists', () => {
    const period = event('period', '30.12.2026', { through: '03.01.2027' });
    const calendar = buildEventCalendar([
      event('late', '01.01.2027 19:00'),
      event('early-b', '01.01.2027 10:00'),
      event('early-a', '01.01.2027 10:00'),
      period,
      event('date-only', '01.01.2027', { status: 'cancelled' })
    ]);
    expect(calendar.days.map((day) => [day.date, day.events.map((item) => item.id)]))
      .toMatchInlineSnapshot(`
      [
        [
          "2026-12-30",
          [
            "period",
          ],
        ],
        [
          "2026-12-31",
          [
            "period",
          ],
        ],
        [
          "2027-01-01",
          [
            "date-only",
            "period",
            "early-a",
            "early-b",
            "late",
          ],
        ],
        [
          "2027-01-02",
          [
            "period",
          ],
        ],
        [
          "2027-01-03",
          [
            "period",
          ],
        ],
      ]
    `);
    expect(
      calendar.months.map((month) => month.events.filter((item) => item.id === 'period'))
    ).toEqual([[period], [period]]);
    expect(period.url).toBe(eventUrl('2026-12-30', 'period'));
  });

  it('keeps overnight events on the start day and does not bridge separate dates', () => {
    const calendar = buildEventCalendar([
      event('night', '05.01.2027 21:00', { ends_at: '06.01.2027 02:00' }),
      event('separate', '09.01.2027', { status: 'cancelled' })
    ]);
    expect(calendar.days.map((day) => day.date)).toEqual(['2027-01-05', '2027-01-09']);
  });

  it('includes leap day and safely stops at the end of a four-digit year', () => {
    const calendar = buildEventCalendar([
      event('leap', '28.02.2028', { through: '01.03.2028' }),
      event('last', '31.12.9999')
    ]);
    expect(calendar.days.map((day) => day.date)).toEqual([
      '2028-02-28',
      '2028-02-29',
      '2028-03-01',
      '9999-12-31'
    ]);
  });

  const calendar = buildEventCalendar([
    event('may', '01.05.2026'),
    event('september', '01.09.2026', { status: 'cancelled' }),
    event('january', '01.01.2027')
  ]);
  it.each([
    ['2026-05-31T20:59:59Z', '2026-05'],
    ['2026-05-31T21:00:00Z', '2026-09'],
    ['2026-09-30T20:59:59Z', '2026-09'],
    ['2026-12-31T21:00:00Z', '2027-01'],
    ['2028-01-01T00:00:00Z', '2027-01']
  ])('selects a month using Moscow build time %s', (now, expected) => {
    expect(selectEventStartMonth(calendar, new Date(now))?.id).toBe(expected);
  });

  it('has no invented month when empty and preserves view while skipping empty months', () => {
    expect(selectEventStartMonth(buildEventCalendar([]), new Date('2026-01-01'))).toBeUndefined();
    expect(eventMonthNavigation(calendar, '2026-09', 'list')).toEqual({
      previous: '/events/2026/05/list/',
      next: '/events/2027/01/list/'
    });
    expect(eventMonthNavigation(calendar, '2026-05')).toEqual({
      previous: undefined,
      next: '/events/2026/09/'
    });
    expect(eventMonthNavigation(calendar, 'missing')).toEqual({
      previous: undefined,
      next: undefined
    });
  });
});
