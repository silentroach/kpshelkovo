import { describe, expect, it } from 'vitest';

import { testPlace } from '@/lib/places/tests/place.test-helper';

import { buildEventMapUrl, formatEventBadgeMonth, formatEventRange } from '../view';

describe('formatEventRange', () => {
  it('formats same-day event ranges', () => {
    expect(
      formatEventRange({
        startsDate: '2026-05-31',
        startsTime: '19:00',
        endsIso: '2026-05-31T21:00:00+03:00',
        endsTime: '21:00'
      })
    ).toMatchInlineSnapshot(`"31 мая 2026, 19:00–21:00"`);
  });

  it('dates an overnight ending in Moscow even when its UTC date matches the start', () => {
    expect(
      formatEventRange({
        startsDate: '2026-05-31',
        startsTime: '23:30',
        endsIso: '2026-05-31T22:00:00Z',
        endsTime: '01:00'
      })
    ).toMatchInlineSnapshot(`"31 мая 2026, 23:30 – 1 июня 2026, 01:00"`);
  });

  it('formats open-ended event ranges with start time only', () => {
    expect(
      formatEventRange({
        startsDate: '2026-05-31',
        startsTime: '19:00'
      })
    ).toMatchInlineSnapshot(`"31 мая 2026, 19:00"`);
  });

  it('keeps a cross-year date-only period inclusive without inventing hours', () => {
    expect(
      formatEventRange({ startsDate: '2026-12-30', through: '2027-01-03' })
    ).toMatchInlineSnapshot(`"30 декабря 2026 – 3 января 2027, включительно"`);
  });

  it('keeps unknown hours explicit for a single date', () => {
    expect(formatEventRange({ startsDate: '2026-05-31' })).toMatchInlineSnapshot(
      `"31 мая 2026, время не указано"`
    );
  });
});

describe('formatEventBadgeMonth', () => {
  it('formats event badge months as full Russian genitive labels', () => {
    expect(formatEventBadgeMonth('2026-06-13T16:00:00+03:00')).toBe('июня');
    expect(formatEventBadgeMonth('2026-01-13T16:00:00+03:00')).toBe('января');
  });
});

describe('buildEventMapUrl', () => {
  it('uses the canonical place map URL even for hidden places', () => {
    expect(
      buildEventMapUrl({
        place: testPlace({ mapUrl: 'https://yandex.ru/navi/example' })
      })
    ).toBe('https://yandex.ru/navi/example');
  });

  it('skips map links without coordinates or location', () => {
    expect(buildEventMapUrl({})).toBeUndefined();
  });
});
