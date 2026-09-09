import { describe, expect, it } from 'vitest';

import {
  buildNewsEventMapEmbedUrl,
  buildNewsEventMapUrl,
  formatNewsEventMonth,
  formatNewsEventRange
} from './view';

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
  it('prefers coordinates for Yandex Maps links', () => {
    expect(
      buildNewsEventMapUrl({
        location: 'КП Шелково, эко-клуб',
        coordinates: { lat: 55.123456, lng: 38.654321 }
      })
    ).toBe('https://yandex.ru/maps/?pt=38.654321,55.123456&z=16&l=map');
  });

  it('builds search links from location when coordinates are missing', () => {
    const url = buildNewsEventMapUrl({ location: 'КП Шелково, эко-клуб' });

    expect(url).toBeDefined();
    expect(new URL(url ?? '').searchParams.get('text')).toBe('КП Шелково, эко-клуб');
  });

  it('skips map links without coordinates or location', () => {
    expect(buildNewsEventMapUrl({})).toBeUndefined();
  });

  it('builds Yandex Maps widget URLs from coordinates', () => {
    const url = buildNewsEventMapEmbedUrl({
      coordinates: { lat: 55.123456, lng: 38.654321 }
    });

    expect(url).toBeDefined();
    expect(new URL(url ?? '').searchParams.get('ll')).toBe('38.654321,55.123456');
    expect(new URL(url ?? '').searchParams.get('pt')).toBeNull();
  });

  it('can offset Yandex Maps widget center for fixed overlay pins', () => {
    const url = buildNewsEventMapEmbedUrl(
      {
        coordinates: { lat: 55.123456, lng: 38.654321 }
      },
      { centerOffsetYPx: 50 }
    );

    const params = new URL(url ?? '').searchParams;
    const [lng = Number.NaN, lat = Number.NaN] = (params.get('ll') ?? '').split(',').map(Number);

    expect(lng).toBe(38.654321);
    expect(lat).toBeLessThan(55.123456);
    expect(lat).toBeGreaterThan(55.122);
  });
});
