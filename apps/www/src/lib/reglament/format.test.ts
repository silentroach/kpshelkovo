import { describe, expect, it } from 'vitest';

import {
  formatReglamentInputNumber,
  formatReglamentAnnualMoney,
  formatReglamentMoney,
  formatReglamentMoneyDelta,
  formatReglamentTariff,
  formatReglamentTariffValue,
  parseReglamentNumberInput
} from './format';

const visibleNbsp = (value: string): string => value.replaceAll('\u00A0', '·');

describe('reglament money formatting', () => {
  it('keeps money, tariff units and deltas together with non-breaking spaces', () => {
    expect(visibleNbsp(formatReglamentMoney(221_264_198))).toMatchInlineSnapshot(`"221·264·198·₽"`);
    expect(visibleNbsp(formatReglamentAnnualMoney(221_264_198))).toMatchInlineSnapshot(
      `"221·264·198·₽/год"`
    );
    expect(visibleNbsp(formatReglamentTariff(902.07))).toMatchInlineSnapshot(`"902,07·₽/сотка"`);
    expect(visibleNbsp(formatReglamentTariffValue(52.39))).toMatchInlineSnapshot(`"52,39·₽"`);
    expect(visibleNbsp(formatReglamentMoneyDelta(-40.87))).toMatchInlineSnapshot(`"-40,87·₽"`);
    expect(visibleNbsp(formatReglamentMoneyDelta(40.87))).toMatchInlineSnapshot(`"+40,87·₽"`);
  });

  it('formats editable numbers with grouped digits while preserving precision', () => {
    expect(visibleNbsp(formatReglamentInputNumber(3_418_555.1))).toMatchInlineSnapshot(
      `"3·418·555,1"`
    );
    expect(visibleNbsp(formatReglamentInputNumber(0.302))).toMatchInlineSnapshot(`"0,302"`);
  });

  it('parses manually entered grouped numbers', () => {
    expect(parseReglamentNumberInput('3 418 555,1')).toBe(3_418_555.1);
    expect(parseReglamentNumberInput('3\u00A0418\u202F555,1')).toBe(3_418_555.1);
  });
});
