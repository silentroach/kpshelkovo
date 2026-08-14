import type {
  SearchClient,
  SearchResponse,
  SearchResult,
  SearchSubResult,
} from './client.types';
import {
  SEARCH_QUERY_MAX_LENGTH,
  SEARCH_RESULT_DEFAULT_LIMIT,
} from './client.types';
import type {
  PagefindClientDependencies,
  PagefindOptions,
  PagefindResultReference,
  PagefindRuntime,
} from './client.internal.types';

const pagefindEntrypoint = '/search/pagefind.js';
const canonicalUrlBase = 'https://kpshelkovo.online';
const pagefindOptions = {
  ranking: {
    metaWeights: {
      sectionId: 0,
      sectionLabel: 0,
      publishedAt: 0,
    },
  },
} as const satisfies PagefindOptions;

const cleanText = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return;
  }

  return value.replace(/\s+/gu, ' ').trim() || undefined;
};

/**
 * Trusted HTML boundary: Pagefind 1.5.2 documents that excerpt source HTML is
 * escaped before it adds highlight <mark> elements. Raw content and arbitrary
 * metadata never pass through this helper.
 */
const trustedPagefindExcerpt = (value: unknown): string | undefined =>
  cleanText(value);

const asRecord = (
  value: unknown,
): Readonly<Record<string, unknown>> | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return;
  }

  return value as Readonly<Record<string, unknown>>;
};

const normalizeUrl = (
  value: unknown,
  requireAnchor = false,
): string | undefined => {
  const rawUrl = cleanText(value);
  if (!rawUrl) {
    return;
  }

  try {
    const url = new URL(rawUrl, canonicalUrlBase);
    if (url.origin !== canonicalUrlBase) {
      return;
    }

    const pathname = url.pathname.replace(/\/index\.html$/u, '/') || '/';
    if (requireAnchor && !url.hash) {
      return;
    }

    return `${pathname}${requireAnchor ? url.hash : ''}`;
  } catch {
    return;
  }
};

const normalizeSubResults = (
  value: unknown,
  pageUrl: string,
): readonly SearchSubResult[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item): readonly SearchSubResult[] => {
    const rawSubResult = asRecord(item);
    const url = normalizeUrl(rawSubResult?.url, true);
    const title = cleanText(rawSubResult?.title);
    if (!url || !title || url.slice(0, url.indexOf('#')) !== pageUrl) {
      return [];
    }

    return [
      {
        url,
        title,
        excerptHtml: trustedPagefindExcerpt(rawSubResult?.excerpt),
      },
    ];
  });
};

const normalizeResult = (value: unknown): SearchResult | undefined => {
  const rawResult = asRecord(value);
  const meta = asRecord(rawResult?.meta);
  const url = normalizeUrl(rawResult?.url);
  const title = cleanText(meta?.title);
  const sectionId = cleanText(meta?.sectionId);
  const sectionLabel = cleanText(meta?.sectionLabel);
  if (!url || !title || !sectionId || !sectionLabel) {
    return;
  }

  return {
    url,
    title,
    description: cleanText(meta?.description),
    section: {
      id: sectionId,
      label: sectionLabel,
    },
    publishedAt: cleanText(meta?.publishedAt),
    excerptHtml: trustedPagefindExcerpt(rawResult?.excerpt),
    subResults: normalizeSubResults(rawResult?.sub_results, url),
  };
};

const normalizeQuery = (query: string): string =>
  Array.from(query.replace(/\s+/gu, ' ').trim())
    .slice(0, SEARCH_QUERY_MAX_LENGTH)
    .join('');

const normalizeResultLimit = (limit?: number): number => {
  if (limit === undefined || !Number.isFinite(limit)) {
    return SEARCH_RESULT_DEFAULT_LIMIT;
  }

  return Math.max(Math.trunc(limit), 1);
};

const cacheableResultId = (value: unknown): string | undefined => {
  if (typeof value !== 'string' || !value || value.trim() !== value) {
    return;
  }

  return value;
};

const loadGeneratedPagefind = async (): Promise<PagefindRuntime> => {
  const pagefind: PagefindRuntime = await import(
    /* @vite-ignore */ pagefindEntrypoint
  );

  return pagefind;
};

const defaultDependencies: PagefindClientDependencies = {
  available:
    !import.meta.env.DEV || import.meta.env.PAGEFIND_DEV_SNAPSHOT_AVAILABLE,
  loadPagefind: loadGeneratedPagefind,
};

export const createPagefindSearchClient = (
  dependencies: PagefindClientDependencies = defaultDependencies,
): SearchClient => {
  let pagefindPromise: Promise<PagefindRuntime> | undefined;
  let latestRequestId = 0;
  let cachedQuery: string | undefined;
  let resultCache = new Map<string, Promise<SearchResult | undefined>>();

  const loadPagefind = (): Promise<PagefindRuntime> => {
    pagefindPromise ??= dependencies.loadPagefind().then(async (pagefind) => {
      await pagefind.options(pagefindOptions);
      return pagefind;
    });

    return pagefindPromise;
  };

  const loadResult = async (
    reference: PagefindResultReference,
  ): Promise<SearchResult | undefined> =>
    normalizeResult(await reference.data());

  const loadCachedResult = (
    reference: PagefindResultReference,
    cache: Map<string, Promise<SearchResult | undefined>>,
  ): Promise<SearchResult | undefined> => {
    const id = cacheableResultId(reference.id);
    if (!id) {
      return loadResult(reference);
    }

    const cached = cache.get(id);
    if (cached) {
      return cached;
    }

    const result = loadResult(reference);
    cache.set(id, result);
    void result.catch(() => {
      if (cache.get(id) === result) {
        cache.delete(id);
      }
    });

    return result;
  };

  const resultCacheFor = (
    query: string,
  ): Map<string, Promise<SearchResult | undefined>> => {
    if (query !== cachedQuery) {
      cachedQuery = query;
      resultCache = new Map();
    }

    return resultCache;
  };

  const search = async (
    rawQuery: string,
    rawLimit?: number,
  ): Promise<SearchResponse | undefined> => {
    const requestId = ++latestRequestId;
    const query = normalizeQuery(rawQuery);

    if (!dependencies.available) {
      return { state: 'devUnavailable', query };
    }

    if (!query) {
      cachedQuery = undefined;
      resultCache = new Map();
      return { state: 'ready', query, results: [], total: 0 };
    }

    const limit = normalizeResultLimit(rawLimit);
    const queryCache = resultCacheFor(query);
    const pagefind = await loadPagefind();
    if (requestId !== latestRequestId) {
      return;
    }

    const response = await pagefind.search(query);
    const results = await Promise.all(
      response.results
        .slice(0, limit)
        .map((result) => loadCachedResult(result, queryCache)),
    );
    if (requestId !== latestRequestId) {
      return;
    }

    return {
      state: 'ready',
      query,
      total: response.results.length,
      results: results.filter((result): result is SearchResult =>
        Boolean(result),
      ),
    };
  };

  return { search };
};

export const pagefindSearchClient = createPagefindSearchClient();
