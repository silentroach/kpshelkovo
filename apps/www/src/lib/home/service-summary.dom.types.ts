export interface HomeServiceSummaryOptions {
  readonly now?: () => number;
}

declare global {
  interface Window {
    __shelkovoHomeServiceSummaryHydration?: boolean;
  }
}
