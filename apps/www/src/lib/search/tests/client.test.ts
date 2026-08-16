import { describe, expect, it, vi } from 'vitest';

import type {
  PagefindRuntime,
  PagefindSearchResponse,
} from '../client.internal.types';
import { createPagefindSearchClient } from '../client';
import {
  SEARCH_QUERY_MAX_LENGTH,
  SEARCH_RESULT_DEFAULT_LIMIT,
} from '../client.types';

const responseWith = (...data: readonly unknown[]): PagefindSearchResponse => ({
  results: data.map((value, index) => ({
    id: `result-${index + 1}`,
    data: async () => value,
  })),
});

const trackedResponseWith = (...values: readonly unknown[]) => {
  const data = values.map((value) => vi.fn(async () => value));
  const response: PagefindSearchResponse = {
    results: data.map((load, index) => ({
      id: `result-${index + 1}`,
      data: load,
    })),
  };

  return { data, response };
};

const validResult = (index: number) => ({
  url: `/news/result-${index}/`,
  excerpt: `Результат ${index}`,
  meta: {
    title: `Результат ${index}`,
    sectionId: 'news',
    sectionLabel: 'Новости',
  },
});

const dataCallCount = (
  loaders: ReturnType<typeof trackedResponseWith>['data'],
): number =>
  loaders.reduce((total, loader) => total + loader.mock.calls.length, 0);

const runtimeWith = (response: PagefindSearchResponse) => {
  const init = vi.fn(async () => {});
  const options = vi.fn(async () => {});
  const preload = vi.fn(async () => {});
  const search = vi.fn(async () => response);
  const runtime: PagefindRuntime = { init, options, preload, search };

  return { init, options, preload, runtime, search };
};

describe('Pagefind search client', () => {
  it('loads, configures, and initializes one runtime lazily without applying sort', async () => {
    const { init, options, runtime, search } = runtimeWith(responseWith());
    const loadPagefind = vi.fn(async () => runtime);
    const client = createPagefindSearchClient({
      available: true,
      loadPagefind,
    });

    expect(loadPagefind).not.toHaveBeenCalled();
    await expect(client.search('   ')).resolves.toMatchInlineSnapshot(`
      {
        "query": "",
        "results": [],
        "state": "ready",
        "total": 0,
      }
    `);
    expect(loadPagefind).not.toHaveBeenCalled();
    await client.init?.();
    await client.init?.();
    await client.search('первый');
    await client.search('второй');

    expect(loadPagefind).toHaveBeenCalledOnce();
    expect(init).toHaveBeenCalledOnce();
    expect(options.mock.calls).toMatchInlineSnapshot(`
      [
        [
          {
            "ranking": {
              "metaWeights": {
                "publishedAt": 0,
                "sectionId": 0,
                "sectionLabel": 0,
                "tags": 1.75,
              },
            },
          },
        ],
      ]
    `);
    expect(search.mock.calls).toMatchInlineSnapshot(`
      [
        [
          "первый",
        ],
        [
          "второй",
        ],
      ]
    `);
  });

  it('retries runtime loading and configuration after failures', async () => {
    const { options, runtime } = runtimeWith(responseWith());
    options
      .mockRejectedValueOnce(new Error('options failed'))
      .mockResolvedValue(undefined);
    const loadPagefind = vi
      .fn<() => Promise<PagefindRuntime>>()
      .mockRejectedValueOnce(new Error('load failed'))
      .mockResolvedValue(runtime);
    const client = createPagefindSearchClient({
      available: true,
      loadPagefind,
    });

    await expect(client.search('первый')).rejects.toThrow('load failed');
    await expect(client.search('второй')).rejects.toThrow('options failed');
    await expect(client.search('третий')).resolves.toMatchObject({
      state: 'ready',
      query: 'третий',
    });
    expect(loadPagefind).toHaveBeenCalledTimes(3);
    expect(options).toHaveBeenCalledTimes(2);
  });

  it('reuses result IDs and only loads additions for a larger batch', async () => {
    const tracked = trackedResponseWith(
      ...Array.from({ length: 16 }, (_, index) => validResult(index + 1)),
    );
    const { runtime, search } = runtimeWith(tracked.response);
    const client = createPagefindSearchClient({
      available: true,
      loadPagefind: async () => runtime,
    });

    const initial = await client.search('  тарифы  ');

    expect(initial).toMatchObject({
      state: 'ready',
      total: 16,
      results: { length: SEARCH_RESULT_DEFAULT_LIMIT },
    });
    expect(dataCallCount(tracked.data)).toBe(SEARCH_RESULT_DEFAULT_LIMIT);
    expect(
      tracked.data
        .slice(SEARCH_RESULT_DEFAULT_LIMIT)
        .every((load) => load.mock.calls.length === 0),
    ).toBe(true);

    const repeated = await client.search('тарифы');

    expect(repeated).toMatchObject({
      state: 'ready',
      total: 16,
      results: { length: SEARCH_RESULT_DEFAULT_LIMIT },
    });
    expect(dataCallCount(tracked.data)).toBe(SEARCH_RESULT_DEFAULT_LIMIT);

    const expanded = await client.search('тарифы', 16);

    expect(expanded).toMatchObject({
      state: 'ready',
      total: 16,
      results: { length: 16 },
    });
    expect(search).toHaveBeenCalledTimes(3);
    expect(dataCallCount(tracked.data)).toBe(16);
    expect(tracked.data.every((load) => load.mock.calls.length === 1)).toBe(
      true,
    );
  });

  it('does not load Pagefind when the dev snapshot is unavailable', async () => {
    const { runtime } = runtimeWith(responseWith());
    const loadPagefind = vi.fn(async () => runtime);
    const client = createPagefindSearchClient({
      available: false,
      loadPagefind,
    });

    await expect(client.search('  тариф  ')).resolves.toMatchInlineSnapshot(`
      {
        "query": "тариф",
        "state": "devUnavailable",
      }
    `);
    await client.init?.();
    await client.preload?.('тариф');
    expect(loadPagefind).not.toHaveBeenCalled();
  });

  it('normalizes allowlisted result fields and anchored sub-results', async () => {
    const { runtime } = runtimeWith(
      responseWith(
        {
          url: 'https://kpshelkovo.online/news/item/index.html?source=test#old',
          excerpt:
            'Текст с <mark>совпадением</mark> и &lt;script&gt;alert(1)&lt;/script&gt;',
          content: '<script>alert(1)</script>',
          meta: {
            title: '  Заголовок\n новости  ',
            description: '  Короткое   описание ',
            sectionId: ' news ',
            sectionLabel: ' Новости ',
            publishedAt: '2026-08-14',
            unchecked: '<img src=x onerror=alert(1)>',
          },
          sub_results: [
            {
              url: '/news/item/',
              title: 'Страница целиком',
              excerpt: 'Без якоря',
            },
            {
              url: '/news/item/#overview',
              title: 'Обзор',
              excerpt: 'Общий фрагмент',
              weighted_locations: [{ balanced_score: 1 }],
            },
            {
              url: '/news/item/#details',
              title: '  Подробности  ',
              excerpt: 'Еще <mark>текст</mark>',
              weighted_locations: [{ balanced_score: 10 }],
            },
            {
              url: '/news/other/#details',
              title: 'Другой документ',
              excerpt: 'Не должен попасть в результат',
            },
          ],
        },
        {
          url: '/815/compare/settlements/shelkovo/',
          meta: {
            title: 'Шелково',
            sectionId: 'compare',
            sectionLabel: 'Сравнение поселков',
          },
        },
      ),
    );
    const client = createPagefindSearchClient({
      available: true,
      loadPagefind: async () => runtime,
    });

    await expect(client.search('текст')).resolves.toMatchInlineSnapshot(`
      {
        "query": "текст",
        "results": [
          {
            "description": "Короткое описание",
            "excerptHtml": "Текст с <mark>совпадением</mark> и &lt;script&gt;alert(1)&lt;/script&gt;",
            "matchContext": undefined,
            "publishedAt": "2026-08-14",
            "section": {
              "id": "news",
              "label": "Новости",
            },
            "subResults": [
              {
                "excerptHtml": "Еще <mark>текст</mark>",
                "title": "Подробности",
                "url": "/news/item/#details",
              },
              {
                "excerptHtml": "Общий фрагмент",
                "title": "Обзор",
                "url": "/news/item/#overview",
              },
            ],
            "title": "Заголовок новости",
            "url": "/news/item/",
          },
          {
            "description": undefined,
            "excerptHtml": undefined,
            "matchContext": undefined,
            "publishedAt": undefined,
            "section": {
              "id": "compare",
              "label": "Сравнение поселков",
            },
            "subResults": [],
            "title": "Шелково",
            "url": "/815/compare/settlements/shelkovo/",
          },
        ],
        "state": "ready",
        "total": 2,
      }
    `);
  });

  it('uses a natural context when only news tags match', async () => {
    const response: PagefindSearchResponse = {
      results: [
        {
          id: 'tagged-news',
          matchedMetaFields: ['tags'],
          score: 4,
          words: [],
          data: async () => ({
            url: '/news/tagged/',
            excerpt: 'Случайное начало статьи, не связанное с запросом',
            meta: {
              title: 'Новость с тегами',
              description: 'Описание новости',
              sectionId: 'news',
              sectionLabel: 'Новости',
              tags: 'благоустройство, дороги',
            },
          }),
        },
      ],
    };
    const { runtime } = runtimeWith(response);
    const client = createPagefindSearchClient({
      available: true,
      loadPagefind: async () => runtime,
    });

    await expect(client.search('благоустройство')).resolves.toMatchObject({
      results: [
        {
          excerptHtml: undefined,
          matchContext: 'Темы новости: благоустройство, дороги.',
        },
      ],
    });
  });

  it('softly reranks loaded news, incidents, and meetings by age', async () => {
    const result = (
      id: string,
      score: number,
      title: string,
      sectionId: 'meetings' | 'news' | 'status',
      publishedAt: string,
    ) => ({
      id,
      score,
      data: async () => ({
        url: `/${sectionId}/${id}/`,
        meta: {
          title,
          sectionId,
          sectionLabel: sectionId,
          publishedAt,
        },
      }),
    });
    const response: PagefindSearchResponse = {
      results: [
        result(
          'old-exact-news',
          12,
          'Старая точная новость',
          'news',
          '2025-08-15',
        ),
        result(
          'old-close-news',
          11.4,
          'Старая близкая новость',
          'news',
          '2025-08-15',
        ),
        result('fresh-news', 10, 'Свежая новость', 'news', '2026-08-01'),
        result('old-incident', 10, 'Старый инцидент', 'status', '2025-08-15'),
        result('fresh-incident', 4, 'Свежий инцидент', 'status', '2026-08-01'),
        result('old-meeting', 10, 'Старая встреча', 'meetings', '2022-08-14'),
        result('fresh-meeting', 6, 'Свежая встреча', 'meetings', '2026-02-21'),
      ],
    };
    const { runtime } = runtimeWith(response);
    const client = createPagefindSearchClient({
      available: true,
      loadPagefind: async () => runtime,
      now: () => new Date('2026-08-15T12:00:00Z'),
    });
    const search = await client.search('общий запрос');

    expect(
      search?.state === 'ready' ? search.results.map(({ title }) => title) : [],
    ).toMatchInlineSnapshot(`
      [
        "Старая точная новость",
        "Свежая новость",
        "Старая близкая новость",
        "Свежая встреча",
        "Старая встреча",
        "Свежий инцидент",
        "Старый инцидент",
      ]
    `);
  });

  it('normalizes result limits without imposing a product cap', async () => {
    const tracked = trackedResponseWith(
      ...Array.from({ length: 12 }, (_, index) => validResult(index + 1)),
    );
    const { runtime } = runtimeWith(tracked.response);
    const searchWithLimit = async (limit: number) => {
      tracked.data.forEach((load) => load.mockClear());
      const client = createPagefindSearchClient({
        available: true,
        loadPagefind: async () => runtime,
      });

      return client.search('limit', limit);
    };

    await searchWithLimit(Number.NaN);
    expect(dataCallCount(tracked.data)).toBe(SEARCH_RESULT_DEFAULT_LIMIT);

    await searchWithLimit(0);
    expect(dataCallCount(tracked.data)).toBe(1);

    await searchWithLimit(3.9);
    expect(dataCallCount(tracked.data)).toBe(3);

    const allAvailable = await searchWithLimit(1_000);
    expect(dataCallCount(tracked.data)).toBe(12);
    expect(allAvailable).toMatchObject({
      state: 'ready',
      total: 12,
      results: { length: 12 },
    });
  });

  it('uses separate cached data for the same ID under different queries', async () => {
    const firstData = vi.fn(async () => ({
      ...validResult(1),
      excerpt: 'Совпадение <mark>первого</mark> запроса',
    }));
    const secondData = vi.fn(async () => ({
      ...validResult(1),
      excerpt: 'Совпадение <mark>второго</mark> запроса',
    }));
    const search = vi.fn(
      async (query: string): Promise<PagefindSearchResponse> => ({
        results: [
          {
            id: 'shared-result',
            data: query === 'первый' ? firstData : secondData,
          },
        ],
      }),
    );
    const runtime: PagefindRuntime = {
      init: vi.fn(async () => {}),
      options: vi.fn(async () => {}),
      preload: vi.fn(async () => {}),
      search,
    };
    const client = createPagefindSearchClient({
      available: true,
      loadPagefind: async () => runtime,
    });

    const first = await client.search('первый', 1);
    const second = await client.search('второй', 1);

    expect([first, second]).toMatchObject([
      {
        results: [{ excerptHtml: 'Совпадение <mark>первого</mark> запроса' }],
      },
      {
        results: [{ excerptHtml: 'Совпадение <mark>второго</mark> запроса' }],
      },
    ]);
    expect(firstData).toHaveBeenCalledOnce();
    expect(secondData).toHaveBeenCalledOnce();
  });

  it('evicts rejected result data so the same query can retry', async () => {
    const data = vi
      .fn<() => Promise<unknown>>()
      .mockRejectedValueOnce(new Error('fragment failed'))
      .mockResolvedValue(validResult(1));
    const response: PagefindSearchResponse = {
      results: [{ id: 'retry-result', data }],
    };
    const { runtime } = runtimeWith(response);
    const client = createPagefindSearchClient({
      available: true,
      loadPagefind: async () => runtime,
    });

    await expect(client.search('ошибка', 1)).rejects.toThrow('fragment failed');
    await expect(client.search('ошибка', 1)).resolves.toMatchObject({
      state: 'ready',
      results: { length: 1 },
    });
    expect(data).toHaveBeenCalledTimes(2);
  });

  it('evicts a stale rejection only from its captured query cache', async () => {
    let rejectOlder: (reason: Error) => void = () => {};
    const olderDataPromise = new Promise<unknown>((_resolve, reject) => {
      rejectOlder = reject;
    });
    const olderData = vi.fn(() => olderDataPromise);
    const newerData = vi.fn(async () => validResult(2));
    const search = vi.fn(
      async (query: string): Promise<PagefindSearchResponse> => ({
        results: [
          {
            id: 'shared-result',
            data: query === 'старый' ? olderData : newerData,
          },
        ],
      }),
    );
    const runtime: PagefindRuntime = {
      init: vi.fn(async () => {}),
      options: vi.fn(async () => {}),
      preload: vi.fn(async () => {}),
      search,
    };
    const client = createPagefindSearchClient({
      available: true,
      loadPagefind: async () => runtime,
    });

    const olderRequest = client.search('старый', 1);
    await vi.waitFor(() => expect(olderData).toHaveBeenCalledOnce());
    await client.search('новый', 1);
    rejectOlder(new Error('stale fragment failed'));

    await expect(olderRequest).rejects.toThrow('stale fragment failed');
    await client.search('новый', 1);
    expect(newerData).toHaveBeenCalledOnce();
  });

  it('keeps changed IDs separate and does not persist invalid IDs', async () => {
    const firstData = vi.fn(async () => validResult(1));
    const secondData = vi.fn(async () => validResult(2));
    const invalidData = vi.fn(async () => validResult(3));
    const search = vi
      .fn<PagefindRuntime['search']>()
      .mockResolvedValueOnce({
        results: [{ id: 'first-result', data: firstData }],
      })
      .mockResolvedValueOnce({
        results: [{ id: 'second-result', data: secondData }],
      })
      .mockResolvedValue({
        results: [{ id: '  ', data: invalidData }],
      });
    const runtime: PagefindRuntime = {
      init: vi.fn(async () => {}),
      options: vi.fn(async () => {}),
      preload: vi.fn(async () => {}),
      search,
    };
    const client = createPagefindSearchClient({
      available: true,
      loadPagefind: async () => runtime,
    });

    const first = await client.search('первый', 1);
    const second = await client.search('второй', 1);
    await client.search('без id', 1);
    await client.search('снова без id', 1);

    expect([first, second]).toMatchObject([
      { state: 'ready', results: [{ title: 'Результат 1' }] },
      { state: 'ready', results: [{ title: 'Результат 2' }] },
    ]);
    expect(firstData).toHaveBeenCalledOnce();
    expect(secondData).toHaveBeenCalledOnce();
    expect(invalidData).toHaveBeenCalledTimes(2);
  });

  it('normalizes whitespace and limits the query before preloading and searching', async () => {
    const { preload, runtime, search } = runtimeWith(responseWith());
    const client = createPagefindSearchClient({
      available: true,
      loadPagefind: async () => runtime,
    });
    const limitedQuery = `  ${'я'.repeat(SEARCH_QUERY_MAX_LENGTH + 10)}  `;

    await client.preload?.('   ');
    await client.preload?.(limitedQuery);
    const result = await client.search(limitedQuery);

    expect(preload).toHaveBeenCalledOnce();
    expect(preload).toHaveBeenCalledWith('я'.repeat(SEARCH_QUERY_MAX_LENGTH));
    expect(search).toHaveBeenCalledWith('я'.repeat(SEARCH_QUERY_MAX_LENGTH));
    expect(result?.query).toHaveLength(SEARCH_QUERY_MAX_LENGTH);
  });

  it('keeps the visible query but removes single-letter function words from Pagefind', async () => {
    const { preload, runtime, search } = runtimeWith(responseWith());
    const loadPagefind = vi.fn(async () => runtime);
    const client = createPagefindSearchClient({
      available: true,
      loadPagefind,
    });

    await client.preload?.('  подать в суд и тариф  ');
    const result = await client.search('  подать в суд и тариф  ');
    const ignored = await client.search(' в ');

    expect({
      ignored,
      loadCalls: loadPagefind.mock.calls.length,
      preloadCalls: preload.mock.calls,
      result,
      searchCalls: search.mock.calls,
    }).toMatchInlineSnapshot(`
      {
        "ignored": {
          "query": "в",
          "results": [],
          "state": "ready",
          "total": 0,
        },
        "loadCalls": 1,
        "preloadCalls": [
          [
            "подать суд тариф",
          ],
        ],
        "result": {
          "query": "подать в суд и тариф",
          "results": [],
          "state": "ready",
          "total": 0,
        },
        "searchCalls": [
          [
            "подать суд тариф",
          ],
        ],
      }
    `);
  });

  it('uses exact short-word matches without losing Pagefind ranking data', async () => {
    const data = {
      broadFood: vi.fn(async () => ({
        ...validResult(1),
        excerpt: 'Широкое совпадение 1',
      })),
      broadMeeting: vi.fn(async () => ({
        ...validResult(3),
        excerpt: 'Широкое совпадение 3',
      })),
      broadNoise: vi.fn(async () => validResult(2)),
      exactFood: vi.fn(async () => ({
        ...validResult(1),
        excerpt: 'Точное совпадение 1',
      })),
      exactMeeting: vi.fn(async () => ({
        ...validResult(3),
        excerpt: 'Точное совпадение 3',
      })),
    };
    const broadResponse: PagefindSearchResponse = {
      results: [
        { id: 'food', score: 12, data: data.broadFood },
        { id: 'noise', score: 8, data: data.broadNoise },
        { id: 'meeting', score: 1, data: data.broadMeeting },
      ],
    };
    const exactResponse: PagefindSearchResponse = {
      results: [
        { id: 'food', data: data.exactFood },
        { id: 'meeting', data: data.exactMeeting },
      ],
    };
    const search = vi.fn(async (query: string) =>
      query === '"еда"' ? exactResponse : broadResponse,
    );
    const runtime: PagefindRuntime = {
      init: vi.fn(async () => {}),
      options: vi.fn(async () => {}),
      preload: vi.fn(async () => {}),
      search,
    };
    const client = createPagefindSearchClient({
      available: true,
      loadPagefind: async () => runtime,
    });

    const result = await client.search('еда');

    expect({
      dataCalls: {
        broadFood: data.broadFood.mock.calls.length,
        broadMeeting: data.broadMeeting.mock.calls.length,
        broadNoise: data.broadNoise.mock.calls.length,
        exactFood: data.exactFood.mock.calls.length,
        exactMeeting: data.exactMeeting.mock.calls.length,
      },
      result,
      searchCalls: search.mock.calls,
    }).toMatchInlineSnapshot(`
      {
        "dataCalls": {
          "broadFood": 0,
          "broadMeeting": 0,
          "broadNoise": 0,
          "exactFood": 1,
          "exactMeeting": 1,
        },
        "result": {
          "query": "еда",
          "results": [
            {
              "description": undefined,
              "excerptHtml": "Точное совпадение 1",
              "matchContext": undefined,
              "publishedAt": undefined,
              "section": {
                "id": "news",
                "label": "Новости",
              },
              "subResults": [],
              "title": "Результат 1",
              "url": "/news/result-1/",
            },
            {
              "description": undefined,
              "excerptHtml": "Точное совпадение 3",
              "matchContext": undefined,
              "publishedAt": undefined,
              "section": {
                "id": "news",
                "label": "Новости",
              },
              "subResults": [],
              "title": "Результат 3",
              "url": "/news/result-3/",
            },
          ],
          "state": "ready",
          "total": 2,
        },
        "searchCalls": [
          [
            "еда",
          ],
          [
            "\"еда\"",
          ],
        ],
      }
    `);
  });

  it('keeps prefix search for an unfinished short word without exact matches', async () => {
    const broadResponse = responseWith(validResult(1));
    const search = vi.fn(async (query: string) =>
      query === '"тар"' ? responseWith() : broadResponse,
    );
    const runtime: PagefindRuntime = {
      init: vi.fn(async () => {}),
      options: vi.fn(async () => {}),
      preload: vi.fn(async () => {}),
      search,
    };
    const client = createPagefindSearchClient({
      available: true,
      loadPagefind: async () => runtime,
    });

    await expect(client.search('тар')).resolves.toMatchObject({
      results: [{ title: 'Результат 1' }],
      total: 1,
    });
  });

  it('discards an older response after a newer request completes', async () => {
    let resolveOlder: (response: PagefindSearchResponse) => void = () => {};
    const olderResponse = new Promise<PagefindSearchResponse>((resolve) => {
      resolveOlder = resolve;
    });
    const options = vi.fn(async () => {});
    const search = vi.fn((query: string) =>
      query === 'старый'
        ? olderResponse
        : Promise.resolve(
            responseWith({
              url: '/news/new/',
              excerpt: 'Новый результат',
              meta: {
                title: 'Новый',
                sectionId: 'news',
                sectionLabel: 'Новости',
              },
            }),
          ),
    );
    const runtime: PagefindRuntime = {
      init: vi.fn(async () => {}),
      options,
      preload: vi.fn(async () => {}),
      search,
    };
    const client = createPagefindSearchClient({
      available: true,
      loadPagefind: async () => runtime,
    });

    const olderRequest = client.search('старый');
    await vi.waitFor(() => expect(search).toHaveBeenCalledWith('старый'));
    const newerResult = await client.search('новый');
    resolveOlder(
      responseWith({
        url: '/news/old/',
        excerpt: 'Старый результат',
        meta: {
          title: 'Старый',
          sectionId: 'news',
          sectionLabel: 'Новости',
        },
      }),
    );

    expect(newerResult?.query).toBe('новый');
    await expect(olderRequest).resolves.toBeUndefined();
  });
});
