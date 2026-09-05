import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('./data', () => ({
  loadAllData: async () => {
    const settlements = [
      { isBaseline: true, shortName: 'Шелково', slug: 'shelkovo' },
      { isBaseline: false, shortName: 'Гринвуд', slug: 'greenwood' },
      { isBaseline: false, shortName: 'Белый парк', slug: 'white-park' },
    ];

    return {
      ratings: new Map([
        ['greenwood', { score: 71 }],
        ['white-park', { score: 84 }],
      ]),
      settlements,
      baseline: settlements[0],
      stats: { totalSettlements: 3 },
    };
  },
}));

let build: typeof import('./llms').build;
let routes: typeof import('./public-surface');

const SITE = 'https://example.com';
const absolute = (path: string): string => new URL(path, SITE).toString();
const settlementUrl = (slug: string): string =>
  absolute(routes.compareSettlementPattern().replace(':slug', slug));
const extractAbsoluteUrls = (document: string): readonly string[] =>
  [...document.matchAll(/<https:\/\/[^>]+>/gu)].map((match) =>
    match[0].slice(1, -1),
  );

beforeAll(async () => {
  Object.assign(import.meta.env, {
    SITE,
    BASE_URL: '/astro-base/',
  });

  routes = await import('./public-surface');
  ({ build } = await import('./llms'));
});

describe('compare llms', () => {
  it('keeps Compare routes independent from a non-root Astro base', () => {
    expect(import.meta.env.BASE_URL).toBe('/astro-base/');
    expect(routes.comparePath()).toBe('/815/compare/');
  });

  it('emits the short document URL sequence from Compare route helpers', async () => {
    const document = await build('short');

    expect(extractAbsoluteUrls(document)).toEqual([
      absolute(routes.comparePath()),
      absolute(routes.compareRatingPath()),
      absolute(routes.compareSettlementsDataPath()),
      absolute(routes.compareExplorerDataPath()),
      absolute(routes.compareSkillsPath()),
      absolute(routes.compareLlmsFullPath()),
      settlementUrl('shelkovo'),
      settlementUrl('white-park'),
      settlementUrl('greenwood'),
    ]);
  });

  it('emits the full document URL sequence from Compare route helpers', async () => {
    const document = await build('full');

    expect(extractAbsoluteUrls(document)).toEqual([
      absolute(routes.comparePath()),
      absolute(routes.compareLlmsPath()),
      absolute(routes.compareLlmsFullPath()),
      absolute(routes.compareRatingPath()),
      absolute(routes.compareSettlementsDataPath()),
      absolute(routes.compareExplorerDataPath()),
      absolute(routes.compareSkillsPath()),
      settlementUrl('shelkovo'),
      settlementUrl('white-park'),
      settlementUrl('greenwood'),
      absolute(routes.compareRatingPath()),
    ]);
  });
});
