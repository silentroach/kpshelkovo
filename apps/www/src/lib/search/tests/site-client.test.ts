import { afterEach, describe, expect, it, vi } from 'vitest';

import type { SearchClient, SearchResponse, SearchResult } from '../client.types';
import type { ParcelSearchFeed } from '../parcel-search.types';
import { createSiteSearchClient } from '../site-client';

const feed: ParcelSearchFeed = {
  parcels: [
    { code: 'SHR-L43', aliases: ['SHR-L44'], part: 'shr' },
    { code: 'SHF-L43', aliases: [], part: 'shf' },
    { code: 'SHV-V43', aliases: [], part: 'shv' }
  ]
};

const pageResult = (index: number): SearchResult => ({
  url: `/news/${index}/?h=foo`,
  title: `Новость ${index}`,
  section: { id: 'news', label: 'Новости' },
  excerptHtml: '<mark>Текст</mark>',
  subResults: []
});

const pagefind = () => {
  const search = vi.fn<SearchClient['search']>(async (query, limit = 8) => ({
    state: 'ready',
    query: query.trim(),
    searchQuery: query.trim(),
    results: Array.from({ length: Math.min(limit, 12) }, (_, index) => pageResult(index + 1)),
    total: 12
  }));
  const init = vi.fn(async () => {});
  const preload = vi.fn(async () => {});
  return { search, init, preload };
};

afterEach(() => vi.unstubAllGlobals());

describe('site search composition', () => {
  it('loads the small same-origin feed only for a whole number and caches successful fetches', async () => {
    const fetchFeed = vi.fn(async () => new Response(JSON.stringify(feed)));
    vi.stubGlobal('fetch', fetchFeed);
    const client = createSiteSearchClient({ pagefind: pagefind() });

    await client.init?.();
    await client.preload?.('L43');
    await client.search('кадастровый номер');
    await client.search('43');
    await client.search('SHR-L43 extra');
    expect(fetchFeed).not.toHaveBeenCalled();

    const first = await client.search('  shr-l43  ');
    const second = await client.search('L43');
    expect(fetchFeed.mock.calls).toMatchInlineSnapshot(`
      [
        [
          "/map/data/parcel-search.json",
        ],
      ]
    `);
    expect(first?.state === 'ready' ? first.results[0] : undefined).toMatchInlineSnapshot(`
      {
        "matchContext": "Шелково Ривер",
        "section": {
          "id": "parcels",
          "label": "Участки",
        },
        "subResults": [],
        "title": "SHR-L43",
        "url": "/map/?p=SHR-L43",
      }
    `);
    expect(second?.state === 'ready' ? second.results.slice(0, 2).map((item) => item.title) : [])
      .toMatchInlineSnapshot(`
      [
        "SHF-L43",
        "SHR-L43",
      ]
    `);
  });

  it('shows one primary code with matched alias, parts and a shared total across pagination', async () => {
    const plain = pagefind();
    const loadParcels = vi.fn(async () => feed);
    const client = createSiteSearchClient({ pagefind: plain, loadParcels });

    const alias = await client.search('l44');
    const fullAlias = await client.search('SHR-L44');
    const initial = await client.search('L43', 2);
    const expanded = await client.search('L43', 8);

    expect(
      [alias, fullAlias].map((response) =>
        response?.state === 'ready' ? response.results[0] : undefined
      )
    ).toMatchInlineSnapshot(`
      [
        {
          "matchContext": "Шелково Ривер · также SHR-L44",
          "section": {
            "id": "parcels",
            "label": "Участки",
          },
          "subResults": [],
          "title": "SHR-L43",
          "url": "/map/?p=SHR-L43",
        },
        {
          "matchContext": "Шелково Ривер · также SHR-L44",
          "section": {
            "id": "parcels",
            "label": "Участки",
          },
          "subResults": [],
          "title": "SHR-L43",
          "url": "/map/?p=SHR-L43",
        },
      ]
    `);
    expect(
      [initial, expanded].map((response) =>
        response?.state === 'ready'
          ? { total: response.total, urls: response.results.map((result) => result.url) }
          : undefined
      )
    ).toMatchInlineSnapshot(`
      [
        {
          "total": 14,
          "urls": [
            "/map/?p=SHF-L43",
            "/map/?p=SHR-L43",
          ],
        },
        {
          "total": 14,
          "urls": [
            "/map/?p=SHF-L43",
            "/map/?p=SHR-L43",
            "/news/1/?h=foo",
            "/news/2/?h=foo",
            "/news/3/?h=foo",
            "/news/4/?h=foo",
            "/news/5/?h=foo",
            "/news/6/?h=foo",
          ],
        },
      ]
    `);
    expect(plain.search.mock.calls.slice(-2)).toMatchInlineSnapshot(`
      [
        [
          "L43",
          1,
        ],
        [
          "L43",
          6,
        ],
      ]
    `);
    expect(loadParcels).toHaveBeenCalledOnce();
  });

  it('keeps Pagefind results on incomplete and non-number queries without fuzzy parcel matches', async () => {
    const plain = pagefind();
    const client = createSiteSearchClient({ pagefind: plain, loadParcels: async () => feed });

    const checks: Array<SearchResponse | undefined> = [];
    for (const query of ['43', 'SHR-L4', 'L9999', 'L43abc', 'участок L43']) {
      checks.push(await client.search(query, 1));
    }
    expect(
      checks.map((response) => (response?.state === 'ready' ? response.results[0]?.url : undefined))
    ).toMatchInlineSnapshot(`
      [
        "/news/1/?h=foo",
        "/news/1/?h=foo",
        "/news/1/?h=foo",
        "/news/1/?h=foo",
        "/news/1/?h=foo",
      ]
    `);
  });

  it('rejects failed/invalid dictionary responses and retries without discarding plain search', async () => {
    const fetchFeed = vi
      .fn()
      .mockResolvedValueOnce(new Response('unavailable', { status: 503 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ parcels: [{ code: 'SHR-L43', aliases: [], part: 'shr', geometry: {} }] })
        )
      )
      .mockResolvedValueOnce(new Response(JSON.stringify(feed)));
    vi.stubGlobal('fetch', fetchFeed);
    const client = createSiteSearchClient({ pagefind: pagefind() });

    await expect(client.search('L43')).rejects.toThrow('unavailable');
    await expect(client.search('L43')).rejects.toThrow();
    await expect(client.search('  карта  ')).resolves.toMatchObject({ state: 'ready', total: 12 });
    await expect(client.search('L43')).resolves.toMatchObject({ state: 'ready', total: 14 });
    expect(fetchFeed).toHaveBeenCalledTimes(3);
  });

  it('ignores an old dictionary result before it can cancel a newer Pagefind request', async () => {
    const pending = Promise.withResolvers<ParcelSearchFeed>();
    const plain = pagefind();
    const client = createSiteSearchClient({ pagefind: plain, loadParcels: () => pending.promise });
    const old = client.search('L43');
    const recent = await client.search('карта');
    pending.resolve(feed);

    expect(recent?.state === 'ready' ? recent.results[0]?.url : undefined).toBe('/news/1/?h=foo');
    await expect(old).resolves.toBeUndefined();
    expect(plain.search).toHaveBeenCalledOnce();
  });

  it('preserves a useful exact result when Pagefind dev index is unavailable', async () => {
    const search = vi.fn(async (query: string): Promise<SearchResponse> => ({
      state: 'devUnavailable',
      query
    }));
    const client = createSiteSearchClient({ pagefind: { search }, loadParcels: async () => feed });

    await expect(client.search('SHV-V43')).resolves.toMatchObject({
      state: 'ready',
      total: 1,
      results: [{ url: '/map/?p=SHV-V43' }]
    });
  });
});
