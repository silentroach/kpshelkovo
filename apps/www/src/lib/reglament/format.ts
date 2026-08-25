import { createNumberFormatterRu, parseNumberInputRu } from '@shelkovo/format';

const MONEY_OPTIONS = {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
} as const;

const INPUT_NUMBER_OPTIONS = {
  maximumFractionDigits: 6,
  minimumFractionDigits: 0,
} as const;

const SIGNED_MONEY_OPTIONS = {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
  signDisplay: 'exceptZero',
} as const;

const NBSP = '\u00A0';

export const formatReglamentNumber = createNumberFormatterRu(MONEY_OPTIONS);

export const formatReglamentInputNumber =
  createNumberFormatterRu(INPUT_NUMBER_OPTIONS);

export const parseReglamentNumberInput = (
  value: number | string,
): number | undefined => parseNumberInputRu(value);

export const formatReglamentSignedNumber =
  createNumberFormatterRu(SIGNED_MONEY_OPTIONS);

export const formatReglamentMoney = (value: number): string =>
  `${formatReglamentNumber(value)}${NBSP}₽`;

export const formatReglamentAnnualMoney = (value: number): string =>
  `${formatReglamentMoney(value)}/год`;

export const formatReglamentTariffValue = (value: number): string =>
  formatReglamentMoney(value);

export const formatReglamentTariff = (value: number): string =>
  `${formatReglamentTariffValue(value)}/сотка`;

export const formatReglamentMoneyDelta = (value: number): string =>
  `${formatReglamentSignedNumber(value)}${NBSP}₽`;
