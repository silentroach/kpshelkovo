import { compareRuText } from '@shelkovo/format';

import type { Rating } from './rating';
import type { Settlement, Stats } from './settlement/types';

type Ranked = Pick<Settlement, 'slug' | 'shortName'> & {
  tariff: Pick<Settlement['tariff'], 'normalizedPerSotkaMonth'>;
};

type Rated = Ranked & {
  score: number;
};

function sort<T extends Ranked>(settlements: readonly T[]): T[] {
  return [...settlements].sort((a, b) => {
    const diff =
      a.tariff.normalizedPerSotkaMonth - b.tariff.normalizedPerSotkaMonth;
    if (diff !== 0) return diff;
    return compareRuText(a.shortName, b.shortName);
  });
}

/**
 * Calculate median of an array of numbers
 * Returns the middle value for odd-length arrays,
 * average of two middle values for even-length arrays
 */
export function calculateMedian(values: readonly number[]): number {
  if (values.length === 0) {
    throw new Error('Cannot calculate median of empty array');
  }

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }

  return sorted[mid];
}

/**
 * Calculate stable tariff rank for every settlement.
 * Rank 1 = lowest tariff, equal tariffs share the same rank.
 */
export function rankSettlements(
  settlements: readonly Ranked[],
): Map<string, number> {
  let prev: number | undefined;
  let rank = 0;
  const ranks = new Map<string, number>();

  sort(settlements).forEach((item) => {
    const tariff = item.tariff.normalizedPerSotkaMonth;

    if (tariff !== prev) {
      prev = tariff;
      rank += 1;
    }

    ranks.set(item.slug, rank);
  });

  return ranks;
}

/**
 * Calculate percentile difference between a value and a baseline
 * Returns percentage difference: (value - baseline) / baseline * 100
 * Positive = value is higher than baseline
 * Negative = value is lower than baseline
 */
export function calculatePercentile(value: number, baseline: number): number {
  if (baseline === 0) return 0;
  return Math.round(((value - baseline) / baseline) * 100);
}

function bands(list: Rated[]): Rated[][] {
  // Держим рейтинговые группы достаточно широкими, чтобы медианы не шумели на малых выборках.
  const count = Math.min(4, Math.max(1, Math.ceil(list.length / 8)));
  const size = Math.ceil(list.length / count);

  return Array.from({ length: count }, (_, i) =>
    list.slice(i * size, (i + 1) * size),
  ).filter((item) => item.length > 0);
}

function peers(
  settlements: readonly Settlement[],
  ratings: ReadonlyMap<string, Rating>,
  base: Settlement,
) {
  const list = settlements
    .map((item) => ({
      slug: item.slug,
      shortName: item.shortName,
      tariff: item.tariff,
      score: ratings.get(item.slug)?.score ?? 0,
    }))
    .sort((a, b) => {
      const diff = a.score - b.score;
      if (diff !== 0) return diff;
      return compareRuText(a.shortName, b.shortName);
    });

  const band =
    bands(list).find((item) => item.some((row) => row.slug === base.slug)) ??
    list;
  const first = band[0];

  if (!first) {
    throw new Error('No peer band found');
  }

  return {
    peerMedianTariff: calculateMedian(
      band.map((item) => item.tariff.normalizedPerSotkaMonth),
    ),
  };
}

/**
 * Compute statistics for all settlements
 * Shelkovo is always the baseline settlement
 */
export function computeStats(
  settlements: readonly Settlement[],
  ratings: ReadonlyMap<string, Rating>,
  baseline: Settlement,
): Stats {
  if (settlements.length === 0) {
    throw new Error('No settlements provided');
  }

  const tariffs = settlements.map((s) => s.tariff.normalizedPerSotkaMonth);
  const shelkovoTariff = baseline.tariff.normalizedPerSotkaMonth;
  const ranks = rankSettlements(settlements);
  const peer = peers(settlements, ratings, baseline);

  const medianTariff = calculateMedian(tariffs);
  const meanTariff = tariffs.reduce((sum, t) => sum + t, 0) / tariffs.length;
  const minTariff = Math.min(...tariffs);
  const maxTariff = Math.max(...tariffs);
  const shelkovoRank = ranks.get(baseline.slug) ?? settlements.length;
  const totalSettlements = settlements.length;
  const cheaperCount = settlements.filter(
    (s) => s.tariff.normalizedPerSotkaMonth < shelkovoTariff,
  ).length;
  const moreExpensiveCount = settlements.filter(
    (s) => s.tariff.normalizedPerSotkaMonth > shelkovoTariff,
  ).length;
  const shelkovoVsMedianPercent = calculatePercentile(
    shelkovoTariff,
    medianTariff,
  );
  const shelkovoVsPeerMedianPercent = calculatePercentile(
    shelkovoTariff,
    peer.peerMedianTariff,
  );
  const shelkovoVsMeanPercent = calculatePercentile(shelkovoTariff, meanTariff);

  return {
    shelkovoTariff,
    medianTariff,
    peerMedianTariff: peer.peerMedianTariff,
    meanTariff,
    minTariff,
    maxTariff,
    shelkovoRank,
    totalSettlements,
    cheaperCount,
    moreExpensiveCount,
    shelkovoVsMedianPercent,
    shelkovoVsPeerMedianPercent,
    shelkovoVsMeanPercent,
  };
}
