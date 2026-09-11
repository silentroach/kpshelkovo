import { DEFAULT_LOT_SOTKA } from './lots';
import type { TariffCalculation, TariffPart, TariffPeriod } from './types';

const MONTHS = { month: 1, quarter: 3, year: 12 } as const satisfies Readonly<
  Record<TariffPeriod, number>
>;

export function calculateTariff(
  source: readonly TariffPart[],
  lotSotka = DEFAULT_LOT_SOTKA
): TariffCalculation {
  const parts = source.map((part) => {
    const months = MONTHS[part.period];
    const monthly = part.value / months;
    return {
      source: part,
      months,
      normalizedPerSotkaMonth: part.unit === 'perSotka' ? monthly : monthly / lotSotka
    };
  });

  return {
    lotSotka,
    parts,
    normalizedPerSotkaMonth: parts.reduce((sum, part) => sum + part.normalizedPerSotkaMonth, 0),
    normalizedIsEstimate: source.some((part) => part.unit !== 'perSotka')
  };
}
