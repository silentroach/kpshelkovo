import { telegram, withBase as join } from '@shelkovo/url';
import type {
  ExplorerPriceFilter,
  ExplorerQueryState,
  ExplorerSort,
} from './url.types';

export const COMPARE_BASE = '/815/compare';

export const DEFAULT_EXPLORER_QUERY: ExplorerQueryState = {
  sortBy: 'rating_desc',
  priceFilter: 'all',
};

const SORT_VALUES: readonly ExplorerSort[] = [
  'tariff_asc',
  'tariff_desc',
  'rating_desc',
  'rating_asc',
  'mkad',
  'distance',
  'name',
];

const PRICE_FILTER_VALUES: readonly ExplorerPriceFilter[] = [
  'all',
  'cheaper',
  'more_expensive',
];

const readQueryValue = <T extends string>(
  value: string | undefined,
  options: readonly T[],
  fallback: T,
): T => options.find((option) => option === value) ?? fallback;

const setQueryValue = <T extends string>(
  params: URLSearchParams,
  key: string,
  value: T,
  fallback: T,
): void => {
  if (value === fallback) {
    params.delete(key);
    return;
  }

  params.set(key, value);
};

export const readExplorerQuery = (search: string): ExplorerQueryState => {
  const params = new URLSearchParams(search);

  return {
    sortBy: readQueryValue(
      params.get('sort') ?? undefined,
      SORT_VALUES,
      DEFAULT_EXPLORER_QUERY.sortBy,
    ),
    priceFilter: readQueryValue(
      params.get('price') ?? undefined,
      PRICE_FILTER_VALUES,
      DEFAULT_EXPLORER_QUERY.priceFilter,
    ),
  };
};

export const buildExplorerUrl = (
  currentUrl: string,
  state: ExplorerQueryState,
): string => {
  const url = new URL(currentUrl);
  setQueryValue(
    url.searchParams,
    'sort',
    state.sortBy,
    DEFAULT_EXPLORER_QUERY.sortBy,
  );
  setQueryValue(
    url.searchParams,
    'price',
    state.priceFilter,
    DEFAULT_EXPLORER_QUERY.priceFilter,
  );

  return `${url.pathname}${url.search}${url.hash}`;
};

/**
 * Builds URL with base path prepended
 * Handles external URLs, anchors, and special protocols
 */
export function withBase(url: string): string {
  return join(COMPARE_BASE, url);
}

export { telegram };
