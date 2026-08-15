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
  const options = vi.fn(async () => {});
  const search = vi.fn(async () => response);
  const runtime: PagefindRuntime = { options, search };

  return { options, runtime, search };
};

describe('Pagefind search client', () => {
  it('loads and configures one runtime lazily without applying sort', async () => {
    const { options, runtime, search } = runtimeWith(responseWith());
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
    await client.search('первый');
    await client.search('второй');

    expect(loadPagefind).toHaveBeenCalledOnce();
    expect(options.mock.calls).toMatchInlineSnapshot(`
      [
        [
          {
            "ranking": {
              "metaWeights": {
                "publishedAt": 0,
                "sectionId": 0,
                "sectionLabel": 0,
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
              url: '/news/item/#details',
              title: '  Подробности  ',
              excerpt: 'Еще <mark>текст</mark>',
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
            ],
            "title": "Заголовок новости",
            "url": "/news/item/",
          },
          {
            "description": undefined,
            "excerptHtml": undefined,
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
      options: vi.fn(async () => {}),
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
      options: vi.fn(async () => {}),
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
      options: vi.fn(async () => {}),
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

  it('normalizes whitespace and limits the query before searching', async () => {
    const { runtime, search } = runtimeWith(responseWith());
    const client = createPagefindSearchClient({
      available: true,
      loadPagefind: async () => runtime,
    });
    const limitedQuery = `  ${'я'.repeat(SEARCH_QUERY_MAX_LENGTH + 10)}  `;

    const result = await client.search(limitedQuery);

    expect(search).toHaveBeenCalledWith('я'.repeat(SEARCH_QUERY_MAX_LENGTH));
    expect(result?.query).toHaveLength(SEARCH_QUERY_MAX_LENGTH);
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
    const runtime: PagefindRuntime = { options, search };
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
