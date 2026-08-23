import { beforeAll, describe, expect, it } from 'vitest';

import type { PlaceWithBacklinks } from '../types';

let buildPlaceMarkdown: typeof import('../markdown').buildPlaceMarkdown;
let buildPlacesMarkdown: typeof import('../markdown').buildPlacesMarkdown;

const place: PlaceWithBacklinks = {
  slug: 'burzhuyka',
  name: 'Буржуйка',
  category: 'food',
  status: 'existing',
  summary: 'Фудтрак в Шелково Форест',
  body: 'Описание **места**.',
  mentions: [],
  backlinks: {
    news: [
      {
        section: 'news',
        kind: 'article',
        sourceId: '2026/07/food-truck',
        title: 'В Шелково открылся фудтрак',
        htmlUrl: '/news/2026/07/food-truck/',
        markdownUrl: '/news/2026/07/food-truck/index.md',
        excerpt: 'Фудтрак работает каждый день.',
        mentionedAt: '2026-07-23T09:00:00.000+03:00',
      },
    ],
    status: [],
    reviews: [],
    places: [],
    people: [],
    contacts: [],
  },
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
  url: '/map/burzhuyka/',
  markdownUrl: '/map/burzhuyka/index.md',
  canonical: 'https://kpshelkovo.online/map/burzhuyka/',
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

    expect(markdown).toContain('https://example.com/map/');
    expect(markdown).toContain('https://example.com/map/burzhuyka/index.md');
    expect(markdown).toContain('https://example.com/sarafan/food/burzhuyka/');
    expect(markdown).toContain('https://yandex.ru/navi/-/CTfgq-5r');
    expect(markdown).toContain('Фудтрак в Шелково Форест');
    expect(markdown).toContain('Описание **места**.');
    expect(markdown).toContain('## Где упоминается');
    expect(markdown).toContain(
      'https://example.com/news/2026/07/food-truck/index.md',
    );
    expect(markdown).not.toMatch(/apps\/www|src\/|repo:/u);
  });

  it('omits a missing optional address', () => {
    const markdown = buildPlaceMarkdown({
      ...place,
      address: undefined,
      status: 'planned',
    });

    expect(markdown).toContain('Статус: Планируется');
    expect(markdown).not.toContain('Адрес:');
  });

  it('publishes an explicit empty backlink state', () => {
    const markdown = buildPlaceMarkdown({
      ...place,
      backlinks: {
        news: [],
        status: [],
        reviews: [],
        places: [],
        people: [],
        contacts: [],
      },
    });

    expect(markdown).toContain('Пока публичных упоминаний не найдено.');
  });
});
