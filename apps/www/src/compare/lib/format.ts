import {
  formatCurrency,
  formatNumberRu,
  formatNumberUnitRu,
  formatTariff,
  pluralize,
} from '@shelkovo/format';
import { getLotBreakdown, getLotAverage } from './settlement/lots';
import type {
  CommonSpaces,
  Infrastructure,
  Lots,
  Tariff,
  TariffPart,
} from './settlement/types';

type TariffView = Pick<
  Tariff,
  'normalizedPerSotkaMonth' | 'normalizedIsEstimate'
>;
type TariffLike = Tariff | TariffView;

const LOT = 10;
const NUMBER_OPTIONS = {
  style: 'decimal',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
} as const satisfies Intl.NumberFormatOptions;

function months(period: Tariff['period']): number {
  if (period === 'month') return 1;
  if (period === 'quarter') return 3;
  return 12;
}

const num = (value: number): string => formatNumberRu(value, NUMBER_OPTIONS);
const money = (value: number, suffix = ''): string =>
  formatNumberUnitRu(value, `₽${suffix}`, NUMBER_OPTIONS);

function area(value: number): string {
  const text = num(value);
  if (Number.isInteger(value)) return `${text} соток`;
  return `${text} сот.`;
}

function why(lots: Lots | undefined): string {
  if (lots?.averageSotka) {
    return (
      lots.averageNote ??
      'Средняя площадь участка добавлена по подтвержденным данным.'
    );
  }

  if (lots?.count && lots.areaHa) {
    return 'Площадь участка оценочная.';
  }

  return 'Среднюю площадь участка по подтвержденным данным не нашли.';
}

function join(value: string): string {
  return value.endsWith('.') ? ' ' : '. ';
}

const numeric = (item: TariffLike): number => item.normalizedPerSotkaMonth;

const estimated = (item: TariffLike): boolean => item.normalizedIsEstimate;

const unit = (value: unknown): Tariff['unit'] => {
  if (value === 'perSotka') return 'perSotka';
  if (value === 'perLot') return 'perLot';
  return 'fixed';
};

const tariffParts = (tariff: Tariff): readonly TariffPart[] =>
  tariff.parts ?? [tariff];

/**
 * Format normalized tariff and add '~' for estimated values.
 */
export function formatTariffAuto(tariff: TariffLike): string {
  const text = formatTariff(numeric(tariff));
  if (!estimated(tariff)) return text;
  return `~${text}`;
}

/**
 * Format original tariff (before normalization).
 */
export function formatTariffBase(tariff: Tariff): string {
  if (tariff.parts) {
    return tariff.parts
      .map((item) => {
        const val = formatCurrency(item.value);
        if (unit(item.unit) === 'perSotka') {
          return `${val}/сотка`;
        }
        return `${val}/участок`;
      })
      .join(' + ');
  }

  const val = formatCurrency(tariff.value);
  if (unit(tariff.unit) === 'perSotka') {
    return `${val}/сотка`;
  }
  return `${val}/участок`;
}

function period(value: Tariff['period']): string {
  if (value === 'month') return 'в месяц';
  if (value === 'quarter') return 'в квартал';
  return 'в год';
}

/**
 * Format original tariff with period included (for markdown/long-form display).
 */
export function formatTariffOriginal(tariff: Tariff): string {
  const list = tariffParts(tariff);
  return list
    .map((item) => {
      const val = formatCurrency(item.value);
      const base =
        unit(item.unit) === 'perSotka' ? `${val}/сотка` : `${val}/участок`;
      return `${base} ${period(item.period)}`;
    })
    .join(' + ');
}

/**
 * Format the source tariff and its normalized monthly value when they differ.
 */
export function formatTariffSummary(tariff: Tariff): string {
  const normalized = `${formatTariffAuto(tariff)} в месяц`;
  const alreadyNormalized =
    !tariff.parts && tariff.unit === 'perSotka' && tariff.period === 'month';

  return alreadyNormalized
    ? normalized
    : `${formatTariffOriginal(tariff)}, это ${normalized}`;
}

/**
 * True when any part of the tariff is not expressed in ₽/сотка.
 */
export function hasNonSotkaUnit(tariff: Tariff): boolean {
  return tariffParts(tariff).some((item) => unit(item.unit) !== 'perSotka');
}

export interface TariffCalcRow {
  title: string;
  source: string;
  formula: string;
}

export interface TariffCalc {
  intro: string;
  assumption?: string;
  rows: TariffCalcRow[];
  total: string;
}

export interface LotCalc {
  known: string;
  factors?: string;
  total: string;
}

/**
 * Generic tooltip for compact cards.
 */
export function getTariffHint(tariff: TariffLike): string | undefined {
  if (!estimated(tariff)) return;
  return 'Тариф приведен к сотке автоматически.';
}

export function getLotCalc(
  lots?: Lots,
  infra?: Infrastructure,
  common?: CommonSpaces,
): LotCalc | undefined {
  const item = getLotBreakdown(lots, infra, common);
  if (!item) return;

  if (item.exact) {
    return {
      known:
        item.areaHa && item.count
          ? `${num(item.areaHa)} га и ${num(item.count)} участков.`
          : item.count
            ? `${num(item.count)} участков.`
            : 'Подтвержденные данные.',
      factors: item.note,
      total: area(item.size),
    };
  }

  const list = item.rows.map((row) => row.title.toLowerCase());
  const head = list.slice(0, 3).join(', ');
  const more = list.length - 3;
  const factors =
    list.length === 0
      ? 'нет подтвержденных вычетов.'
      : more > 0
        ? `${head} и еще ${more} ${pluralize(more, ['фактор', 'фактора', 'факторов'])}.`
        : `${head}.`;

  return {
    known: `${num(item.areaHa)} га и ${num(item.count)} участков.`,
    factors: item.cap
      ? `${factors} Вычет ограничен 2,5 сот. на участок.`
      : factors,
    total: `${num(item.gross)} − ${num(item.shared)} = ${num(item.size)} сот.`,
  };
}

/**
 * Detailed normalization breakdown for settlement page.
 */
export function getTariffCalc(
  tariff: Tariff,
  lots?: Lots,
  infra?: Infrastructure,
  common?: CommonSpaces,
): TariffCalc | undefined {
  const size = getLotAverage(lots, infra, common) ?? LOT;
  const list = tariffParts(tariff);
  const multi = list.length > 1;
  const lot = list.some((item) => unit(item.unit) !== 'perSotka');

  if (!multi && !lot) return;

  const rows = list.map((item, i) => {
    const m = months(item.period);
    const mons = pluralize(m, ['месяц', 'месяца', 'месяцев']);
    const value = item.value;
    const monthly = value / m;
    const normalized =
      unit(item.unit) === 'perSotka' ? monthly : monthly / size;
    const title = multi ? `Часть ${i + 1}` : 'Тариф';
    const source =
      unit(item.unit) === 'perSotka'
        ? 'Указан за сотку.'
        : unit(item.unit) === 'perLot'
          ? 'Указан за участок.'
          : 'Указан фиксированной суммой за участок.';
    const formula =
      unit(item.unit) === 'perSotka'
        ? `${money(value)} / ${m} ${mons} = ${money(normalized, '/сотка')} в месяц`
        : `(${money(value)} / ${m} ${mons}) / ${area(size)} = ${money(normalized, '/сотка')} в месяц`;

    return { title, source, formula };
  });

  const total = list.reduce((sum, item) => {
    const monthly = item.value / months(item.period);
    if (unit(item.unit) === 'perSotka') return sum + monthly;
    return sum + monthly / size;
  }, 0);

  return {
    intro: multi
      ? 'Тариф состоит из нескольких частей. Для сравнения каждая часть приведена к ₽/сотка в месяц, затем значения суммированы.'
      : 'Тариф приведен к ₽/сотка в месяц для корректного сравнения.',
    ...(lot
      ? {
          assumption: `Допущение: 1 участок = ${area(size)}${join(area(size))}${why(lots)}`,
        }
      : {}),
    rows,
    total: `${money(total, '/сотка')} в месяц`,
  };
}
