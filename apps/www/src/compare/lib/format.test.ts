import { describe, it, expect } from 'vitest';
import {
  formatTariffAuto,
  formatTariffBase,
  getLotCalc,
  getTariffHint,
  getTariffCalc,
} from './format';
import { visibleWhitespace } from '@/lib/test/visible-whitespace';

describe('Format Module', () => {
  describe('formatTariffAuto', () => {
    it('should keep exact tariffs without tilde', () => {
      expect(
        formatTariffAuto({
          value: 1000,
          unit: 'perSotka',
          period: 'month',
          normalizedPerSotkaMonth: 1000,
          normalizedIsEstimate: false,
        }),
      ).toBe('1\u00A0000\u00A0₽/сотка');
    });

    it('should add tilde for estimated tariffs', () => {
      expect(
        formatTariffAuto({
          value: 12000,
          unit: 'perLot',
          period: 'month',
          normalizedPerSotkaMonth: 1200,
          normalizedIsEstimate: true,
        }),
      ).toBe('~1\u00A0200\u00A0₽/сотка');
    });
  });

  describe('formatTariffBase', () => {
    it('should format tariff per sotka', () => {
      expect(
        formatTariffBase({
          value: 500,
          unit: 'perSotka',
          period: 'month',
          normalizedPerSotkaMonth: 500,
          normalizedIsEstimate: false,
        }),
      ).toBe('500\u00A0₽/сотка');
    });

    it('should format tariff per lot', () => {
      expect(
        formatTariffBase({
          value: 4000,
          unit: 'perLot',
          period: 'month',
          normalizedPerSotkaMonth: 400,
          normalizedIsEstimate: true,
        }),
      ).toBe('4\u00A0000\u00A0₽/участок');
    });

    it('should format fixed tariff as per lot', () => {
      expect(
        formatTariffBase({
          value: 12000,
          unit: 'fixed',
          period: 'year',
          normalizedPerSotkaMonth: 100,
          normalizedIsEstimate: true,
        }),
      ).toBe('12\u00A0000\u00A0₽/участок');
    });

    it('should format multi-part tariff as combined formula', () => {
      expect(
        formatTariffBase({
          value: 5813,
          unit: 'perLot',
          period: 'month',
          normalizedPerSotkaMonth: 681.3,
          normalizedIsEstimate: true,
          parts: [
            {
              value: 5813,
              unit: 'perLot',
              period: 'month',
            },
            {
              value: 100,
              unit: 'perSotka',
              period: 'month',
            },
          ],
        }),
      ).toBe('5\u00A0813\u00A0₽/участок + 100\u00A0₽/сотка');
    });
  });

  describe('getTariffHint', () => {
    it('should return undefined for exact tariffs', () => {
      expect(
        getTariffHint({
          value: 1000,
          unit: 'perSotka',
          period: 'month',
          normalizedPerSotkaMonth: 1000,
          normalizedIsEstimate: false,
        }),
      ).toBe(undefined);
    });

    it('should return generic hint for estimated tariffs', () => {
      const hint = getTariffHint({
        value: 5813,
        unit: 'perLot',
        period: 'month',
        normalizedPerSotkaMonth: 681.3,
        normalizedIsEstimate: true,
        parts: [
          {
            value: 5813,
            unit: 'perLot',
            period: 'month',
          },
          {
            value: 100,
            unit: 'perSotka',
            period: 'month',
          },
        ],
      });

      expect(hint).toBe('Тариф приведен к сотке автоматически.');
    });
  });

  describe('getTariffCalc', () => {
    it('should return undefined for exact single tariff', () => {
      expect(
        getTariffCalc({
          value: 1000,
          unit: 'perSotka',
          period: 'month',
          normalizedPerSotkaMonth: 1000,
          normalizedIsEstimate: false,
        }),
      ).toBe(undefined);
    });

    it('should build detailed calc for estimated single tariff', () => {
      const calc = getTariffCalc({
        value: 9000,
        unit: 'perLot',
        period: 'quarter',
        normalizedPerSotkaMonth: 300,
        normalizedIsEstimate: true,
      });

      expect(visibleWhitespace(calc)).toMatchInlineSnapshot(`
        {
          "assumption": "Допущение: 1 участок = 10 соток. Среднюю площадь участка по подтвержденным данным не нашли.",
          "intro": "Тариф приведен к ₽/сотка в месяц для корректного сравнения.",
          "rows": [
            {
              "formula": "(9·000·₽ / 3 месяца) / 10 соток = 300·₽/сотка в месяц",
              "source": "Указан за участок.",
              "title": "Тариф",
            },
          ],
          "total": "300·₽/сотка в месяц",
        }
      `);
    });

    it('should use known average lot size in tariff breakdown', () => {
      const calc = getTariffCalc(
        {
          value: 1780,
          unit: 'perLot',
          period: 'month',
          normalizedPerSotkaMonth: 100,
          normalizedIsEstimate: true,
        },
        {
          averageSotka: 17.8,
          averageNote:
            'Средняя площадь рассчитана по опубликованным площадям лотов.',
        },
      );

      expect(visibleWhitespace(calc)).toMatchInlineSnapshot(`
        {
          "assumption": "Допущение: 1 участок = 17,8 сот. Средняя площадь рассчитана по опубликованным площадям лотов.",
          "intro": "Тариф приведен к ₽/сотка в месяц для корректного сравнения.",
          "rows": [
            {
              "formula": "(1·780·₽ / 1 месяц) / 17,8 сот. = 100·₽/сотка в месяц",
              "source": "Указан за участок.",
              "title": "Тариф",
            },
          ],
          "total": "100·₽/сотка в месяц",
        }
      `);
    });

    it('should use short lot-area note in tariff breakdown', () => {
      const calc = getTariffCalc(
        {
          value: 12100,
          unit: 'perLot',
          period: 'month',
          normalizedPerSotkaMonth: 360.58,
          normalizedIsEstimate: true,
        },
        {
          count: 298,
          areaHa: 100,
        },
        {
          roads: 'asphalt',
          sidewalks: 'partial',
          drainage: 'open',
          checkpoints: 'yes',
        },
        {
          playgrounds: 'yes',
          sports: 'yes',
        },
      );

      expect(calc?.assumption).toContain('Площадь участка оценочная.');
    });

    it('should build detailed calc for multi-part tariff', () => {
      const calc = getTariffCalc({
        value: 5813,
        unit: 'perLot',
        period: 'month',
        normalizedPerSotkaMonth: 681.3,
        normalizedIsEstimate: true,
        parts: [
          {
            value: 5813,
            unit: 'perLot',
            period: 'month',
          },
          {
            value: 100,
            unit: 'perSotka',
            period: 'month',
          },
        ],
      });

      expect(visibleWhitespace(calc)).toMatchInlineSnapshot(`
        {
          "assumption": "Допущение: 1 участок = 10 соток. Среднюю площадь участка по подтвержденным данным не нашли.",
          "intro": "Тариф состоит из нескольких частей. Для сравнения каждая часть приведена к ₽/сотка в месяц, затем значения суммированы.",
          "rows": [
            {
              "formula": "(5·813·₽ / 1 месяц) / 10 соток = 581,3·₽/сотка в месяц",
              "source": "Указан за участок.",
              "title": "Часть 1",
            },
            {
              "formula": "100·₽ / 1 месяц = 100·₽/сотка в месяц",
              "source": "Указан за сотку.",
              "title": "Часть 2",
            },
          ],
          "total": "681,3·₽/сотка в месяц",
        }
      `);
    });
  });

  describe('getLotCalc', () => {
    it('should build lot breakdown for estimated average', () => {
      const calc = getLotCalc(
        {
          count: 298,
          areaHa: 100,
        },
        {
          roads: 'asphalt',
          sidewalks: 'partial',
          drainage: 'open',
          checkpoints: 'yes',
        },
        {
          playgrounds: 'yes',
          sports: 'yes',
        },
      );

      expect(calc).toMatchInlineSnapshot(`
        {
          "factors": "дороги, тротуары, ливневки и еще 3 фактора.",
          "known": "100 га и 298 участков.",
          "total": "33,56 − 1,55 = 32,01 сот.",
        }
      `);
    });

    it('should build lot breakdown for explicit average', () => {
      const calc = getLotCalc({
        count: 150,
        areaHa: 32,
        averageSotka: 20.4,
        averageNote:
          'Средняя площадь рассчитана по опубликованным площадям лотов.',
      });

      expect(calc).toMatchInlineSnapshot(`
        {
          "factors": "Средняя площадь рассчитана по опубликованным площадям лотов.",
          "known": "32 га и 150 участков.",
          "total": "20,4 сот.",
        }
      `);
    });
  });
});
