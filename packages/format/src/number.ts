export const padNumber = (value: number | string, size = 2): string =>
  String(value).padStart(size, '0');

const NBSP = '\u00A0';

const normalizeSpaces = (value: string): string => value.replace(/\s/g, NBSP);

export const createNumberFormatterRu = (
  options?: Intl.NumberFormatOptions,
): ((value: number) => string) => {
  const formatter = new Intl.NumberFormat('ru-RU', options);

  return (value) => normalizeSpaces(formatter.format(value));
};

export const formatNumberRu = (
  value: number,
  options?: Intl.NumberFormatOptions,
): string =>
  normalizeSpaces(new Intl.NumberFormat('ru-RU', options).format(value));

export const formatNumberUnitRu = (
  value: number,
  unit: string,
  options?: Intl.NumberFormatOptions,
): string => `${formatNumberRu(value, options)}${NBSP}${unit}`;

export const parseNumberInputRu = (
  value: number | string,
): number | undefined => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }

  const normalized = value
    .trim()
    .replace(/[\s\u00A0\u202F]/g, '')
    .replace(',', '.')
    .replace('−', '-');

  if (!normalized) {
    return undefined;
  }

  const numberValue = Number(normalized);

  return Number.isFinite(numberValue) ? numberValue : undefined;
};
