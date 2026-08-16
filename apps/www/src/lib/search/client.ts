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
  LoadedPagefindResult,
  PagefindOptions,
  PagefindResultReference,
  PagefindRuntime,
} from './client.internal.types';

const pagefindEntrypoint = '/search/pagefind.js';
const canonicalUrlBase = 'https://kpshelkovo.online';
const ignoredSingleLetterWords = new Set(['а', 'в', 'и', 'к', 'о', 'с', 'у']);
const shortQueryMaxLength = 3;
const pagefindOptions = {
  ranking: {
    metaWeights: {
      sectionId: 0,
      sectionLabel: 0,
      publishedAt: 0,
      tags: 1.75,
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

const pagefindScore = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(value, 0) : 0;

const asStringList = (value: unknown): readonly string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];

const subResultScore = (value: unknown): number =>
  Array.isArray(value)
    ? value.reduce((total, item) => {
        const score = asRecord(item)?.balanced_score;
        return total + pagefindScore(score);
      }, 0)
    : 0;

const newsTagContext = (value: unknown): string | undefined => {
  const labels = cleanText(value)
    ?.split(',')
    .map((label) => label.trim())
    .filter(Boolean);
  if (!labels?.length) {
    return;
  }

  const prefix = labels.length === 1 ? 'Тема новости' : 'Темы новости';
  return `${prefix}: ${labels.join(', ')}.`;
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

  return value
    .flatMap((item, index) => {
      const rawSubResult = asRecord(item);
      const url = normalizeUrl(rawSubResult?.url, true);
      const title = cleanText(rawSubResult?.title);
      if (!url || !title || url.slice(0, url.indexOf('#')) !== pageUrl) {
        return [];
      }

      return [
        {
          index,
          score: subResultScore(rawSubResult?.weighted_locations),
          result: {
            url,
            title,
            excerptHtml: trustedPagefindExcerpt(rawSubResult?.excerpt),
          } satisfies SearchSubResult,
        },
      ];
    })
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map((item) => item.result);
};

const normalizeResult = (
  value: unknown,
  reference: PagefindResultReference,
): SearchResult | undefined => {
  const rawResult = asRecord(value);
  const meta = asRecord(rawResult?.meta);
  const url = normalizeUrl(rawResult?.url);
  const title = cleanText(meta?.title);
  const sectionId = cleanText(meta?.sectionId);
  const sectionLabel = cleanText(meta?.sectionLabel);
  if (!url || !title || !sectionId || !sectionLabel) {
    return;
  }

  const matchedMetaFields = asStringList(reference.matchedMetaFields);
  const matchContext =
    (!Array.isArray(reference.words) || reference.words.length === 0) &&
    matchedMetaFields.includes('tags')
      ? newsTagContext(meta?.tags)
      : undefined;

  return {
    url,
    title,
    description: cleanText(meta?.description),
    section: {
      id: sectionId,
      label: sectionLabel,
    },
    publishedAt: cleanText(meta?.publishedAt),
    matchContext,
    excerptHtml: matchContext
      ? undefined
      : trustedPagefindExcerpt(rawResult?.excerpt),
    subResults: normalizeSubResults(rawResult?.sub_results, url),
  };
};

const publishedDate = (value: string): Date | undefined => {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const elapsedCalendarMonths = (date: Date, now: Date): number =>
  Math.max(
    0,
    (now.getUTCFullYear() - date.getUTCFullYear()) * 12 +
      now.getUTCMonth() -
      date.getUTCMonth(),
  );

const elapsedFullYears = (date: Date, now: Date): number => {
  const beforeAnniversary =
    now.getUTCMonth() < date.getUTCMonth() ||
    (now.getUTCMonth() === date.getUTCMonth() &&
      now.getUTCDate() < date.getUTCDate());

  return Math.max(
    0,
    now.getUTCFullYear() - date.getUTCFullYear() - (beforeAnniversary ? 1 : 0),
  );
};

const newsRecencyFactor = (months: number): number => {
  const bonuses = [0.15, 0.1, 0.06, 0.03] as const;
  return 1 + (bonuses[months] ?? 0);
};

const recencyFactor = (result: SearchResult, now: Date): number => {
  if (!result.publishedAt) {
    return 1;
  }

  const date = publishedDate(result.publishedAt);
  if (!date) {
    return 1;
  }

  switch (result.section.id) {
    case 'news':
      return newsRecencyFactor(elapsedCalendarMonths(date, now));
    case 'status':
      return Math.max(0.35, 0.9 ** elapsedCalendarMonths(date, now));
    case 'meetings':
      return Math.max(0.5, 0.8 ** elapsedFullYears(date, now));
    default:
      return 1;
  }
};

const rankResults = (
  loaded: readonly LoadedPagefindResult[],
  now: Date,
): readonly SearchResult[] =>
  loaded
    .map((item, index) => ({
      index,
      result: item.result,
      score: item.score * recencyFactor(item.result, now),
    }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map((item) => item.result);

const normalizeQuery = (query: string): string =>
  Array.from(query.replace(/\s+/gu, ' ').trim())
    .slice(0, SEARCH_QUERY_MAX_LENGTH)
    .join('');

const searchableToken = (token: string): string =>
  Array.from(token.matchAll(/[\p{L}\p{N}]/gu), ([character]) => character)
    .join('')
    .toLocaleLowerCase('ru');

const pagefindQuery = (query: string): string =>
  query
    .split(' ')
    .filter((token) => !ignoredSingleLetterWords.has(searchableToken(token)))
    .join(' ');

const exactShortQuery = (query: string): string | undefined => {
  const words = query.match(/[\p{L}\p{N}]+/gu);
  if (words?.length !== 1) {
    return;
  }

  const word = words[0];
  return word && Array.from(word).length <= shortQueryMaxLength
    ? `"${word}"`
    : undefined;
};

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
  let resultCache = new Map<
    string,
    Promise<LoadedPagefindResult | undefined>
  >();

  const loadPagefind = (): Promise<PagefindRuntime> => {
    if (pagefindPromise) {
      return pagefindPromise;
    }

    const promise = dependencies.loadPagefind().then(async (pagefind) => {
      await pagefind.options(pagefindOptions);
      await pagefind.init();
      return pagefind;
    });
    pagefindPromise = promise;
    void promise.catch(() => {
      if (pagefindPromise === promise) {
        pagefindPromise = undefined;
      }
    });

    return promise;
  };

  const init = async (): Promise<void> => {
    if (!dependencies.available) {
      return;
    }

    await loadPagefind();
  };

  const preload = async (rawQuery: string): Promise<void> => {
    const query = pagefindQuery(normalizeQuery(rawQuery));
    if (!dependencies.available || !query) {
      return;
    }

    const pagefind = await loadPagefind();
    await pagefind.preload(query);
  };

  const loadResult = async (
    reference: PagefindResultReference,
  ): Promise<LoadedPagefindResult | undefined> => {
    const result = normalizeResult(await reference.data(), reference);
    return result
      ? { result, score: pagefindScore(reference.score) }
      : undefined;
  };

  const loadCachedResult = (
    reference: PagefindResultReference,
    cache: Map<string, Promise<LoadedPagefindResult | undefined>>,
  ): Promise<LoadedPagefindResult | undefined> => {
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
  ): Map<string, Promise<LoadedPagefindResult | undefined>> => {
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
    const effectiveQuery = pagefindQuery(query);

    if (!dependencies.available) {
      return { state: 'devUnavailable', query };
    }

    if (!effectiveQuery) {
      cachedQuery = undefined;
      resultCache = new Map();
      return { state: 'ready', query, results: [], total: 0 };
    }

    const limit = normalizeResultLimit(rawLimit);
    const queryCache = resultCacheFor(effectiveQuery);
    const pagefind = await loadPagefind();
    if (requestId !== latestRequestId) {
      return;
    }

    const broadSearch = pagefind.search(effectiveQuery);
    const exactQuery = exactShortQuery(effectiveQuery);
    const [broadResponse, exactResponse] = await Promise.all([
      broadSearch,
      exactQuery ? pagefind.search(exactQuery) : broadSearch,
    ]);
    const exactIds = new Set(
      exactQuery
        ? exactResponse.results.flatMap((reference) => {
            const id = cacheableResultId(reference.id);
            return id ? [id] : [];
          })
        : [],
    );
    const exactResults = exactIds.size
      ? broadResponse.results.filter((reference) => {
          const id = cacheableResultId(reference.id);
          return Boolean(id && exactIds.has(id));
        })
      : broadResponse.results;
    const results = exactResults.length ? exactResults : broadResponse.results;
    if (requestId !== latestRequestId) {
      return;
    }

    const loaded = await Promise.all(
      results
        .slice(0, limit)
        .map((result) => loadCachedResult(result, queryCache)),
    );
    if (requestId !== latestRequestId) {
      return;
    }

    return {
      state: 'ready',
      query,
      total: results.length,
      results: rankResults(
        loaded.filter((result): result is LoadedPagefindResult =>
          Boolean(result),
        ),
        dependencies.now?.() ?? new Date(),
      ),
    };
  };

  return { init, preload, search };
};

export const pagefindSearchClient = createPagefindSearchClient();
