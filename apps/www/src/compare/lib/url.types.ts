export type ExplorerSort =
  | 'tariff_asc'
  | 'tariff_desc'
  | 'rating_desc'
  | 'rating_asc'
  | 'mkad'
  | 'distance'
  | 'name';

export type ExplorerPriceFilter = 'all' | 'cheaper' | 'more_expensive';

export interface ExplorerQueryState {
  readonly sortBy: ExplorerSort;
  readonly priceFilter: ExplorerPriceFilter;
}
