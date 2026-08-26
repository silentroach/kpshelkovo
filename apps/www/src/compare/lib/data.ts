import { getCollection, type CollectionEntry } from 'astro:content';
import type { CompareData, SettlementData } from './data.types';
import type { ComparisonResult, Settlement } from './settlement/types';
import { computeStats } from './stats';
import { compareSettlements } from './comparisons';
import { buildRatings } from './rating';
import { mapRawSettlement } from './settlement/mapper';
import type { RawSettlement } from './settlement/schema';

const requireBaseline = (settlements: readonly Settlement[]): Settlement => {
  const baselines = settlements.filter((settlement) => settlement.isBaseline);
  const [baseline] = baselines;

  if (!baseline) {
    throw new Error(
      'Settlements collection must contain exactly one baseline settlement; found 0',
    );
  }

  if (baselines.length > 1) {
    const slugs = baselines
      .map((settlement) => settlement.slug)
      .sort()
      .join(', ');

    throw new Error(
      `Settlements collection must contain exactly one baseline settlement; found ${baselines.length} (${slugs})`,
    );
  }

  return baseline;
};

export async function loadSettlements(): Promise<SettlementData> {
  const settlements = await getCollection('settlements');
  const mapped = settlements.map(
    (entry: CollectionEntry<'settlements'>): Settlement =>
      mapRawSettlement(entry.data as RawSettlement),
  );

  return {
    settlements: mapped,
    baseline: requireBaseline(mapped),
  };
}

/**
 * Compare all settlements with Shelkovo baseline
 * Returns a Map of slug -> ComparisonResult
 */
export function compareAllSettlements(
  settlements: Settlement[],
  baseline: Settlement,
): Map<string, ComparisonResult> {
  const comparisons = new Map<string, ComparisonResult>();

  for (const settlement of settlements) {
    const comparison = compareSettlements(baseline, settlement);
    comparisons.set(settlement.slug, comparison);
  }

  return comparisons;
}

export async function loadAllData(): Promise<CompareData> {
  const { settlements, baseline } = await loadSettlements();
  const ratings = buildRatings(settlements);
  const stats = computeStats(settlements, ratings, baseline);
  const comparisons = compareAllSettlements(settlements, baseline);

  return { settlements, baseline, stats, comparisons, ratings };
}
