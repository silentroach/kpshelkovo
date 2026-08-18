import { formatNumberUnitRu } from './number';

const rub = (value: number, suffix: string): string =>
  formatNumberUnitRu(Math.round(value), `₽${suffix}`, {
    maximumFractionDigits: 0,
  });

/**
 * Formats a number as Russian rubles.
 */
export function formatCurrency(value: number): string {
  return rub(value, '');
}

/**
 * Formats distance in kilometers.
 */
export function formatDistance(value: number): string {
  if (value < 10) {
    return `${Math.round(value)} км`;
  }

  const rounded = Math.round(value / 10) * 10;
  return `~${rounded} км`;
}

/**
 * Formats a decimal as a percentage.
 */
export function formatPercentage(
  value: number,
  opts?: { signed?: boolean },
): string {
  const pct = value * 100;
  const factor = 10;
  const rounded =
    pct >= 0
      ? Math.floor(pct * factor + 0.5) / factor
      : Math.ceil(pct * factor - 0.5) / factor;

  if (rounded === 0) {
    return '0%';
  }

  const signed = opts?.signed ?? true;
  const sign = rounded > 0 ? '+' : '−';
  const abs = Math.abs(rounded);
  const text = Number.isInteger(abs) ? abs.toString() : abs.toFixed(1);

  return `${signed ? sign : ''}${text}%`;
}

/**
 * Formats tariff per sotka.
 */
export function formatTariff(value: number): string {
  return rub(value, '/сотка');
}
