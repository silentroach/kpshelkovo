import type { Rating } from './rating';
import type { ComparisonResult, Settlement, Stats } from './settlement/types';

export interface SettlementData {
  readonly settlements: Settlement[];
  readonly baseline: Settlement;
}

export interface CompareData extends SettlementData {
  readonly stats: Stats;
  readonly comparisons: Map<string, ComparisonResult>;
  readonly ratings: Map<string, Rating>;
}
