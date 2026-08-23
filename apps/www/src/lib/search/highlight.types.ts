export interface PagefindHighlightOptions {
  readonly addStyles: boolean;
  readonly highlightParam: string;
  readonly markOptions: {
    readonly className: string;
  };
}

export type PagefindHighlightConstructor = new (
  options: PagefindHighlightOptions,
) => unknown;

export interface PagefindHighlightModule {
  readonly default: PagefindHighlightConstructor;
}

export type PagefindHighlightLoader =
  () => Promise<PagefindHighlightConstructor>;
