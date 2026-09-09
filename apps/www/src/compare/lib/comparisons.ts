import type { ComparisonResult, Settlement } from './settlement/types';

/**
 * Calculate tariff delta between Shelkovo and another settlement
 * Returns absolute delta, percentage delta, and whether other is cheaper
 */
export function calculateTariffDelta(
  shelkovoTariff: number,
  otherTariff: number
): { delta: number; deltaPercent: number; isCheaper: boolean } {
  const delta = shelkovoTariff - otherTariff;
  const deltaPercent = shelkovoTariff !== 0 ? Math.round((delta / shelkovoTariff) * 100) : 0;
  const isCheaper = otherTariff < shelkovoTariff;

  return { delta, deltaPercent, isCheaper };
}

/**
 * Compare a settlement with Shelkovo baseline
 * Returns tariff comparison result
 */
export function compareSettlements(baseline: Settlement, other: Settlement): ComparisonResult {
  const tariff = calculateTariffDelta(
    baseline.tariff.normalizedPerSotkaMonth,
    other.tariff.normalizedPerSotkaMonth
  );

  return {
    tariffDelta: tariff.delta,
    tariffDeltaPercent: tariff.deltaPercent,
    isCheaper: tariff.isCheaper
  };
}
