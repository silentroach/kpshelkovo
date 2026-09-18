import { describe, expect, it } from 'vitest';

import { testPlace } from '@/lib/places/tests/place.test-helper';

import { buildNewsEventMapUrl, formatNewsEventMonth, formatNewsEventRange } from './view';

describe('formatNewsEventRange', () => {
  it('formats same-day event ranges', () => {
    expect(
      formatNewsEventRange({
        startsIso: '2026-05-31T19:00:00+03:00',
        startsTime: '19:00',
        endsIso: '2026-05-31T21:00:00+03:00',
        endsTime: '21:00'
      })
    ).toBe('31 мая 2026, 19:00-21:00');
  });

  it('formats multi-day event ranges', () => {
    expect(
      formatNewsEventRange({
        startsIso: '2026-05-31T23:30:00+03:00',
        startsTime: '23:30',
        endsIso: '2026-06-01T01:00:00+03:00',
        endsTime: '01:00'
      })
    ).toBe('31 мая 2026, 23:30 - 1 июня 2026, 01:00');
  });

  it('formats open-ended event ranges with start time only', () => {
    expect(
      formatNewsEventRange({
        startsIso: '2026-05-31T19:00:00+03:00',
        startsTime: '19:00'
      })
    ).toBe('31 мая 2026, 19:00');
  });
});

describe('formatNewsEventMonth', () => {
  it('formats event badge months as full Russian genitive labels', () => {
    expect(formatNewsEventMonth('2026-06-13T16:00:00+03:00')).toBe('июня');
    expect(formatNewsEventMonth('2026-01-13T16:00:00+03:00')).toBe('января');
  });
});

describe('buildNewsEventMapUrl', () => {
  it('uses the canonical place map URL even for hidden places', () => {
    expect(
      buildNewsEventMapUrl({
        place: testPlace({ mapUrl: 'https://yandex.ru/navi/example' })
      })
    ).toBe('https://yandex.ru/navi/example');
  });

  it('skips map links without coordinates or location', () => {
    expect(buildNewsEventMapUrl({})).toBeUndefined();
  });
});
