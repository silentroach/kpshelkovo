export interface PagefindOptions {
  readonly ranking: {
    readonly metaWeights: Readonly<Record<string, number>>;
  };
}

export interface PagefindResultReference {
  readonly id?: unknown;
  readonly data: () => Promise<unknown>;
}

export interface PagefindSearchResponse {
  readonly results: readonly PagefindResultReference[];
}

export interface PagefindRuntime {
  readonly options: (options: PagefindOptions) => Promise<void>;
  readonly search: (query: string) => Promise<PagefindSearchResponse>;
}

export interface PagefindClientDependencies {
  readonly available: boolean;
  readonly loadPagefind: () => Promise<PagefindRuntime>;
}
