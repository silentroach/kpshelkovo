export const SEARCH_QUERY_MAX_LENGTH = 200;
export const SEARCH_RESULT_DEFAULT_LIMIT = 8;

export interface SearchResultSection {
  readonly id: string;
  readonly label: string;
}

export interface SearchSubResult {
  readonly url: string;
  readonly title: string;
  /** Pagefind-escaped text with Pagefind-added highlight <mark> elements. */
  readonly excerptHtml?: string;
}

export interface SearchResult {
  readonly url: string;
  readonly title: string;
  readonly description?: string;
  readonly section: SearchResultSection;
  readonly publishedAt?: string;
  /** Pagefind-escaped text with Pagefind-added highlight <mark> elements. */
  readonly excerptHtml?: string;
  readonly subResults: readonly SearchSubResult[];
}

export interface SearchReadyResponse {
  readonly state: 'ready';
  readonly query: string;
  readonly results: readonly SearchResult[];
  /** Total Pagefind references before result data is materialized. */
  readonly total: number;
}

export interface SearchDevUnavailableResponse {
  readonly state: 'devUnavailable';
  readonly query: string;
}

export type SearchResponse = SearchReadyResponse | SearchDevUnavailableResponse;

export interface SearchClient {
  readonly init?: () => Promise<void>;
  readonly preload?: (query: string) => Promise<void>;
  /** A stale request resolves to undefined so callers can leave newer state intact. */
  readonly search: (
    query: string,
    limit?: number,
  ) => Promise<SearchResponse | undefined>;
}
