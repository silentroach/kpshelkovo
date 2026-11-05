/** Only failures while reading a Pagefind result can be retried locally. */
export class SearchResultLoadError extends Error {
  constructor(cause: unknown) {
    super('Failed to load search result', { cause });
    this.name = 'SearchResultLoadError';
  }
}
