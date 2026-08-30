import type { Rating } from './rating';
import type { ComparisonResult, Settlement, Stats } from './settlement/types';

export interface SettlementData {
  readonly settlements: readonly Settlement[];
  readonly baseline: Settlement;
}

export interface CompareData extends SettlementData {
  readonly stats: Stats;
  readonly comparisons: ReadonlyMap<string, ComparisonResult>;
  readonly ratings: ReadonlyMap<string, Rating>;
}
