import { beforeAll, describe, expect, it } from 'vitest';

import type { Place } from '../types';

let buildPlaceMarkdown: typeof import('../markdown').buildPlaceMarkdown;
let buildPlacesMarkdown: typeof import('../markdown').buildPlacesMarkdown;

const place: Place = {
  slug: 'burzhuyka',
  name: 'Буржуйка',
  summary: 'Фудтрак в Шелково Форест',
  address: 'Шелково Форест, Берёзовая улица, 21А',
  coordinates: { lat: 55.060526, lng: 37.716242 },
  mapUrl: 'https://yandex.ru/navi/-/CTfgq-5r',
  contactUrl: '/sarafan/food/burzhuyka/',
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
    expect(markdown).not.toMatch(/apps\/www|src\/|repo:/u);
  });
});
