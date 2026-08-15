import type { SearchResult } from './client.types';

export interface PagefindOptions {
  readonly ranking: {
    readonly metaWeights: Readonly<Record<string, number>>;
  };
}

export interface PagefindResultReference {
  readonly id?: unknown;
  readonly matchedMetaFields?: unknown;
  readonly score?: unknown;
  readonly words?: unknown;
  readonly data: () => Promise<unknown>;
}

export interface LoadedPagefindResult {
  readonly result: SearchResult;
  readonly score: number;
}

export interface PagefindSearchResponse {
  readonly results: readonly PagefindResultReference[];
}

export interface PagefindRuntime {
  readonly init: () => Promise<void>;
  readonly options: (options: PagefindOptions) => Promise<void>;
  readonly preload: (query: string) => Promise<void>;
  readonly search: (query: string) => Promise<PagefindSearchResponse>;
}

export interface PagefindClientDependencies {
  readonly available: boolean;
  readonly loadPagefind: () => Promise<PagefindRuntime>;
  readonly now?: () => Date;
}
