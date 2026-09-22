import { getParcelUrl } from '@/lib/parcels/parcel-url';
import { parcelSearchDataUrl } from '@/lib/parcels/routes';
import { PARCEL_CODE } from '@/lib/parcels/schema';

import { pagefindSearchClient } from './client';
import { SEARCH_QUERY_MAX_LENGTH, SEARCH_RESULT_DEFAULT_LIMIT } from './client.types';
import type { SearchClient, SearchResponse, SearchResult } from './client.types';
import { parcelSearchFeedSchema } from './parcel-search-schema';
import type {
  ParcelSearchEntry,
  ParcelSearchFeed,
  SiteSearchDependencies
} from './parcel-search.types';

const shortParcelNumber = /^[A-Z]+[0-9]+$/;
const partNames = {
  shr: 'Шелково Ривер',
  shf: 'Шелково Форест',
  shp: 'Шелково Парк',
  shv: 'Шелково Вилладж'
} as const;

const loadParcelFeed = async (): Promise<ParcelSearchFeed> => {
  const response = await fetch(parcelSearchDataUrl());
  if (!response.ok) {
    throw new Error(`Parcel search data unavailable: ${response.status}`);
  }

  return parcelSearchFeedSchema.parse(await response.json());
};

const matchedAlias = (parcel: ParcelSearchEntry, query: string): string | undefined =>
  parcel.aliases.find((alias) => alias === query || alias.slice(alias.indexOf('-') + 1) === query);

const parcelResults = (
  parcels: readonly ParcelSearchEntry[],
  query: string
): readonly SearchResult[] => {
  const codes = new Set<string>();
  return parcels
    .flatMap((parcel) => {
      const alias = matchedAlias(parcel, query);
      if (
        codes.has(parcel.code) ||
        (parcel.code !== query &&
          parcel.code.slice(parcel.code.indexOf('-') + 1) !== query &&
          !alias)
      ) {
        return [];
      }

      codes.add(parcel.code);
      return [
        {
          url: getParcelUrl(parcel.code),
          title: parcel.code,
          section: { id: 'parcels', label: 'Участки' },
          matchContext: alias
            ? `${partNames[parcel.part]} · также ${alias}`
            : partNames[parcel.part],
          subResults: []
        } satisfies SearchResult
      ];
    })
    .sort((left, right) => left.title.localeCompare(right.title, 'en'));
};

export const createSiteSearchClient = (
  dependencies: SiteSearchDependencies = { pagefind: pagefindSearchClient }
): SearchClient => {
  let parcelPromise: Promise<ParcelSearchFeed> | undefined;
  let latestRequestId = 0;

  const loadParcels = (): Promise<ParcelSearchFeed> => {
    if (parcelPromise) {
      return parcelPromise;
    }

    const promise = (dependencies.loadParcels ?? loadParcelFeed)();
    parcelPromise = promise;
    void promise.catch(() => {
      if (parcelPromise === promise) {
        parcelPromise = undefined;
      }
    });
    return promise;
  };

  const search = async (
    rawQuery: string,
    rawLimit?: number
  ): Promise<SearchResponse | undefined> => {
    const requestId = ++latestRequestId;
    const query = Array.from(rawQuery.trim()).slice(0, SEARCH_QUERY_MAX_LENGTH).join('');
    const code = query.toUpperCase();
    if (!PARCEL_CODE.test(code) && !shortParcelNumber.test(code)) {
      const response = await dependencies.pagefind.search(rawQuery, rawLimit);
      return requestId === latestRequestId ? response : undefined;
    }

    const parcels = parcelResults((await loadParcels()).parcels, code);
    if (requestId !== latestRequestId) {
      return;
    }

    const limit =
      rawLimit === undefined || !Number.isFinite(rawLimit)
        ? SEARCH_RESULT_DEFAULT_LIMIT
        : Math.max(1, Math.trunc(rawLimit));
    const response = await dependencies.pagefind.search(
      rawQuery,
      Math.max(1, limit - parcels.length)
    );
    if (requestId !== latestRequestId || !response) {
      return;
    }
    if (response.state === 'devUnavailable') {
      return parcels.length
        ? {
            state: 'ready',
            query,
            searchQuery: query,
            results: parcels.slice(0, limit),
            total: parcels.length
          }
        : response;
    }

    return {
      state: 'ready',
      query: response.query,
      searchQuery: response.searchQuery,
      results: [...parcels, ...response.results].slice(0, limit),
      total: parcels.length + response.total
    };
  };

  return { init: dependencies.pagefind.init, preload: dependencies.pagefind.preload, search };
};

export const siteSearchClient = createSiteSearchClient();
