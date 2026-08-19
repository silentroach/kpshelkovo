import { beforeAll, describe, expect, it } from 'vitest';

import type { Place } from '../types';

let buildPlaceMarkdown: typeof import('../markdown').buildPlaceMarkdown;
let buildPlacesMarkdown: typeof import('../markdown').buildPlacesMarkdown;

const place: Place = {
  slug: 'burzhuyka',
  name: 'Буржуйка',
  category: 'food',
  status: 'existing',
  summary: 'Фудтрак в Шелково Форест',
  body: 'Описание **места**.',
  mentions: [],
  address: 'Шелково Форест, Берёзовая улица, 21А',
  coordinates: { lat: 55.060526, lng: 37.716242 },
  mapUrl: 'https://yandex.ru/navi/-/CTfgq-5r',
  openingHours: {
    description: 'С 10:00 до 22:00, вторник — выходной',
    periods: [
      {
        days: ['mon', 'wed', 'thu', 'fri', 'sat', 'sun'],
        opensAt: '10:00',
        closesAt: '22:00',
      },
    ],
  },
  contact: {
    id: 'food/burzhuyka',
    url: '/sarafan/food/burzhuyka/',
  },
  updatedAt: new Date('2026-08-11T00:00:00.000Z'),
  updatedIso: '2026-08-11',
  url: '/places/burzhuyka/',
  markdownUrl: '/places/burzhuyka/index.md',
  canonical: 'https://kpshelkovo.online/places/burzhuyka/',
};

beforeAll(async () => {
  Object.assign(import.meta.env, {
    SITE: 'https://example.com',
    BASE_URL: '/',
  });

  ({ buildPlaceMarkdown, buildPlacesMarkdown } = await import('../markdown'));
});

describe('places Markdown', () => {
  it('publishes stable index and detail links without internal paths', () => {
    const markdown = [
      buildPlacesMarkdown([place]),
      buildPlaceMarkdown(place),
    ].join('\n');

    expect(markdown).toContain('https://example.com/places/');
    expect(markdown).toContain('https://example.com/places/burzhuyka/index.md');
    expect(markdown).toContain('https://example.com/sarafan/food/burzhuyka/');
    expect(markdown).toContain('https://yandex.ru/navi/-/CTfgq-5r');
    expect(markdown).toContain('Фудтрак в Шелково Форест');
    expect(markdown).toContain('Описание **места**.');
    expect(markdown).not.toMatch(/apps\/www|src\/|repo:/u);
  });

  it('publishes the status and source of a future place', () => {
    const markdown = buildPlaceMarkdown({
      ...place,
      status: 'planned',
      evidence: {
        sourceUrl: 'https://example.com/source',
        checkedAt: new Date('2026-08-12T00:00:00.000Z'),
        checkedIso: '2026-08-12',
      },
    });

    expect(markdown).toContain('Статус: Планируется');
    expect(markdown).toContain('https://example.com/source');
    expect(markdown).toContain('12 августа 2026');
  });
});
