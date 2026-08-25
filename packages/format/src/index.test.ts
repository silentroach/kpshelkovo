import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  count,
  createNumberFormatterRu,
  formatCurrency,
  formatDate,
  formatDistance,
  formatMonth,
  formatNumberRu,
  formatNumberUnitRu,
  formatPercentage,
  formatTariff,
  parseNumberInputRu,
  pluralize,
} from './index';

afterEach(() => vi.restoreAllMocks());

const visibleNbsp = (value: string): string => value.replaceAll('\u00A0', '·');

describe('format package', () => {
  describe('formatCurrency', () => {
    it('formats rounded rubles', () => {
      expect(formatCurrency(1234.56)).toBe('1\u00A0235\u00A0₽');
      expect(formatCurrency(1000)).toBe('1\u00A0000\u00A0₽');
      expect(formatCurrency(100)).toBe('100\u00A0₽');
      expect(formatCurrency(0)).toBe('0\u00A0₽');
    });

    it('uses nearest integer rounding', () => {
      expect(formatCurrency(1234.4)).toBe('1\u00A0234\u00A0₽');
      expect(formatCurrency(1234.5)).toBe('1\u00A0235\u00A0₽');
    });
  });

  describe('formatNumberRu', () => {
    it('formats grouped decimal numbers with non-breaking spaces', () => {
      expect(
        formatNumberRu(3_418_555.1, {
          maximumFractionDigits: 2,
          minimumFractionDigits: 0,
        }),
      ).toBe('3\u00A0418\u00A0555,1');
    });

    it('supports signed number options', () => {
      expect(
        formatNumberRu(40.87, {
          maximumFractionDigits: 2,
          minimumFractionDigits: 0,
          signDisplay: 'exceptZero',
        }),
      ).toBe('+40,87');
    });

    it('reuses a prepared formatter', () => {
      const NativeNumberFormat = Intl.NumberFormat;
      const numberFormat = vi
        .spyOn(Intl, 'NumberFormat')
        .mockImplementation(function NumberFormat(locales, options) {
          return new NativeNumberFormat(locales, options);
        });
      const format = createNumberFormatterRu({
        maximumFractionDigits: 2,
        minimumFractionDigits: 0,
      });

      expect(
        [format(3_418_555.1), format(40.87), format(-40.87)].map(visibleNbsp),
      ).toMatchInlineSnapshot(`
          [
            "3·418·555,1",
            "40,87",
            "-40,87",
          ]
        `);
      expect(numberFormat).toHaveBeenCalledTimes(1);
    });
  });

  describe('formatNumberUnitRu', () => {
    it('keeps number and unit together', () => {
      expect(
        formatNumberUnitRu(52.39, '₽', {
          maximumFractionDigits: 2,
          minimumFractionDigits: 0,
        }),
      ).toBe('52,39\u00A0₽');
    });
  });

  describe('parseNumberInputRu', () => {
    it('parses manually entered grouped numbers', () => {
      expect(parseNumberInputRu('3 418 555,1')).toBe(3_418_555.1);
      expect(parseNumberInputRu('3\u00A0418\u202F555,1')).toBe(3_418_555.1);
      expect(parseNumberInputRu('')).toBeUndefined();
      expect(parseNumberInputRu(Number.NaN)).toBeUndefined();
    });
  });

  describe('formatDistance', () => {
    it('formats distances below ten as whole kilometers', () => {
      expect(formatDistance(5.7)).toBe('6 км');
      expect(formatDistance(0.5)).toBe('1 км');
      expect(formatDistance(9.4)).toBe('9 км');
      expect(formatDistance(0)).toBe('0 км');
      expect(formatDistance(5)).toBe('5 км');
      expect(formatDistance(9)).toBe('9 км');
    });

    it('formats longer distances with tilde and tens rounding', () => {
      expect(formatDistance(10)).toBe('~10 км');
      expect(formatDistance(15)).toBe('~20 км');
      expect(formatDistance(24)).toBe('~20 км');
      expect(formatDistance(25)).toBe('~30 км');
      expect(formatDistance(95)).toBe('~100 км');
    });
  });

  describe('formatPercentage', () => {
    it('formats signed percentages', () => {
      expect(formatPercentage(0.4567)).toBe('+45.7%');
      expect(formatPercentage(-0.2345)).toBe('−23.5%');
      expect(formatPercentage(0)).toBe('0%');
      expect(formatPercentage(1)).toBe('+100%');
      expect(formatPercentage(-1)).toBe('−100%');
    });

    it('uses math minus instead of hyphen', () => {
      const text = formatPercentage(-0.5);

      expect(text).toBe('−50%');
      expect(text.charAt(0)).toBe('−');
      expect(text.charAt(0)).not.toBe('-');
    });

    it('rounds to one decimal place', () => {
      expect(formatPercentage(0.1234)).toBe('+12.3%');
      expect(formatPercentage(0.1256)).toBe('+12.6%');
    });

    it('can omit sign', () => {
      expect(formatPercentage(0.4567, { signed: false })).toBe('45.7%');
      expect(formatPercentage(-0.2345, { signed: false })).toBe('23.5%');
      expect(formatPercentage(0, { signed: false })).toBe('0%');
    });
  });

  describe('formatTariff', () => {
    it('formats tariffs per sotka', () => {
      expect(formatTariff(4500)).toBe('4\u00A0500\u00A0₽/сотка');
      expect(formatTariff(120)).toBe('120\u00A0₽/сотка');
      expect(formatTariff(10000)).toBe('10\u00A0000\u00A0₽/сотка');
    });
  });

  describe('formatDate', () => {
    it('formats ISO dates in Russian', () => {
      expect(formatDate('2026-04-03')).toBe('3 апреля 2026');
      expect(formatDate('2026-01-15')).toBe('15 января 2026');
      expect(formatDate('2026-12-31')).toBe('31 декабря 2026');
      expect(formatDate('2026-05-01')).toBe('1 мая 2026');
      expect(formatDate('2024-02-29')).toBe('29 февраля 2024');
    });

    it('formats datetimes in Moscow timezone', () => {
      expect(formatDate('2026-03-31T22:30:00Z')).toBe('1 апреля 2026');
    });
  });

  describe('formatMonth', () => {
    it('formats month with year in Russian', () => {
      expect(formatMonth(2026, 4)).toBe('апрель 2026 г.');
      expect(formatMonth(2026, 1)).toBe('январь 2026 г.');
      expect(formatMonth(2024, 2)).toBe('февраль 2024 г.');
    });

    it('can format month without year', () => {
      expect(formatMonth(2026, 4, { includeYear: false })).toBe('апрель');
      expect(formatMonth(2026, 12, { includeYear: false })).toBe('декабрь');
    });
  });

  describe('pluralize', () => {
    const forms = ['новость', 'новости', 'новостей'] as const;

    it('uses singular form for one', () => {
      expect(pluralize(1, forms)).toBe('новость');
      expect(pluralize(21, forms)).toBe('новость');
      expect(pluralize(101, forms)).toBe('новость');
    });

    it('uses few form for two to four', () => {
      expect(pluralize(2, forms)).toBe('новости');
      expect(pluralize(4, forms)).toBe('новости');
      expect(pluralize(22, forms)).toBe('новости');
    });

    it('uses many form for zero teens and five plus', () => {
      expect(pluralize(0, forms)).toBe('новостей');
      expect(pluralize(5, forms)).toBe('новостей');
      expect(pluralize(11, forms)).toBe('новостей');
      expect(pluralize(14, forms)).toBe('новостей');
      expect(pluralize(25, forms)).toBe('новостей');
    });

    it('ignores sign and fractional part', () => {
      expect(pluralize(-2, forms)).toBe('новости');
      expect(pluralize(1.9, forms)).toBe('новость');
    });

    it('formats count with matching plural form', () => {
      expect(count(1, forms)).toBe('1 новость');
      expect(count(2, forms)).toBe('2 новости');
      expect(count(5, forms)).toBe('5 новостей');
    });
  });
});
