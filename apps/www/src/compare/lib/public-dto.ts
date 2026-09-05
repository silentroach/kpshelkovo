import type { PublicComparisons, PublicStats } from './public-dto.types';
import type { ComparisonResult, Stats } from './settlement/types';

export type {
  PublicComparison,
  PublicComparisons,
  PublicStats,
} from './public-dto.types';

export const toPublicStats = (stats: Stats): PublicStats => ({
  shelkovoTariff: stats.shelkovoTariff,
  medianTariff: stats.medianTariff,
  peerMedianTariff: stats.peerMedianTariff,
  meanTariff: stats.meanTariff,
  minTariff: stats.minTariff,
  maxTariff: stats.maxTariff,
  shelkovoRank: stats.shelkovoRank,
  totalSettlements: stats.totalSettlements,
  cheaperCount: stats.cheaperCount,
  moreExpensiveCount: stats.moreExpensiveCount,
  shelkovoVsMedianPercent: stats.shelkovoVsMedianPercent,
  shelkovoVsPeerMedianPercent: stats.shelkovoVsPeerMedianPercent,
  shelkovoVsMeanPercent: stats.shelkovoVsMeanPercent,
});

export const toPublicComparisons = (
  comparisons: ReadonlyMap<string, ComparisonResult>,
): PublicComparisons =>
  Object.fromEntries(
    Array.from(comparisons.entries()).map(([slug, comparison]) => [
      slug,
      {
        tariffDelta: comparison.tariffDelta,
        tariffDeltaPercent: comparison.tariffDeltaPercent,
        isCheaper: comparison.isCheaper,
      },
    ]),
  );
