// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  buildReglamentCalculatorChanges,
  calculateReglamentCalculatorState,
  hydrateReglamentCalculator,
} from './calculator-controller';
import type { CalculatedEstimate, CalculatedEstimateRow } from './calculate';
import {
  formatReglamentInputNumber,
  formatReglamentAnnualMoney,
  formatReglamentMoney,
  formatReglamentTariffValue,
} from './format';

const findCalculatedRow = (
  result: CalculatedEstimate,
  rowId: string,
): CalculatedEstimateRow => {
  const rows = result.sections.flatMap((section) => section.rows);
  const row = rows.find((item) => item.id === rowId);

  if (!row) {
    throw new Error(`Missing calculated row ${rowId}`);
  }

  return row;
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('buildReglamentCalculatorChanges', () => {
  it('omits unchanged baseline fields', () => {
    expect(
      buildReglamentCalculatorChanges([
        {
          rowId: 'lighting-electricity',
          key: 'enabled',
          baseline: true,
          value: true,
        },
        {
          rowId: 'lighting-electricity',
          key: 'frequency',
          baseline: 12,
          value: '12',
        },
      ]),
    ).toEqual({});
  });

  it('groups changed editable fields by estimate row', () => {
    expect(
      buildReglamentCalculatorChanges([
        {
          rowId: 'lighting-electricity',
          key: 'enabled',
          baseline: true,
          value: false,
        },
        {
          rowId: 'lighting-electricity',
          key: 'volume',
          baseline: 218_457.5,
          value: '200000',
        },
        {
          rowId: 'lighting-electricity',
          key: 'rate',
          baseline: 6.29,
          value: '7.1',
        },
        {
          rowId: 'security-access-control',
          key: 'fixed_price',
          baseline: 10_199_356,
          value: '9000000',
        },
      ]),
    ).toEqual({
      rows: {
        'lighting-electricity': {
          enabled: false,
          volume: 200_000,
          rate: 7.1,
        },
        'security-access-control': {
          fixed_price: 9_000_000,
        },
      },
    });
  });

  it('keeps zero numeric changes and skips incomplete number input', () => {
    expect(
      buildReglamentCalculatorChanges([
        {
          rowId: 'lighting-electricity',
          key: 'frequency',
          baseline: 12,
          value: '0',
        },
        {
          rowId: 'lighting-electricity',
          key: 'fixed_price',
          baseline: 1_473_084,
          value: '',
        },
      ]),
    ).toEqual({
      rows: {
        'lighting-electricity': {
          frequency: 0,
        },
      },
    });
  });

  it('skips negative values for every numeric field', () => {
    expect(
      buildReglamentCalculatorChanges([
        {
          rowId: 'cleaning-winter-mechanized',
          key: 'volume',
          baseline: 81_778,
          value: '-100',
        },
        {
          rowId: 'cleaning-winter-mechanized',
          key: 'frequency',
          baseline: 116,
          value: '−1',
        },
        {
          rowId: 'cleaning-winter-mechanized',
          key: 'rate',
          baseline: 2.26,
          value: '-0,5',
        },
        {
          rowId: 'cleaning-winter-mechanized',
          key: 'primary_salary',
          baseline: 1_000,
          value: -1,
        },
      ]),
    ).toEqual({});
  });

  it('renders expert field changes into row annual total and breakdown details', () => {
    const rowId = 'waste-transfer-from-homes';
    document.body.innerHTML = `
      <div data-reglament-calculator>
        <input
          type="number"
          data-reglament-field="primary_salary"
          data-reglament-row-id="${rowId}"
          data-reglament-baseline="3418555.1"
          value="3418555.1"
        />
        <span data-reglament-row-annual="${rowId}"></span>
        <span
          data-reglament-row-breakdown="${rowId}"
          data-reglament-breakdown-field="primary_salary"
        ></span>
        <span
          data-reglament-row-breakdown="${rowId}"
          data-reglament-breakdown-field="gross"
        ></span>
      </div>
    `;
    const root = document.querySelector('[data-reglament-calculator]');
    const input = document.querySelector('input');

    if (
      !(root instanceof HTMLElement) ||
      !(input instanceof HTMLInputElement)
    ) {
      throw new Error('Missing calculator fixture nodes');
    }

    hydrateReglamentCalculator(root);
    input.value = '3000000';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    const expectedRow = findCalculatedRow(
      calculateReglamentCalculatorState([
        {
          rowId,
          key: 'primary_salary',
          baseline: 3_418_555.1,
          value: '3000000',
        },
      ]),
      rowId,
    );

    expect(
      document.querySelector('[data-reglament-row-annual]')?.textContent,
    ).toBe(formatReglamentAnnualMoney(expectedRow.annual_gross));
    expect(
      document.querySelector(
        '[data-reglament-breakdown-field="primary_salary"]',
      )?.textContent,
    ).toBe(formatReglamentMoney(expectedRow.breakdown.primary_salary));
    expect(
      document.querySelector('[data-reglament-breakdown-field="gross"]')
        ?.textContent,
    ).toBe(formatReglamentMoney(expectedRow.breakdown.gross));
  });

  it('syncs editable breakdown inputs after basic multiplier changes', () => {
    const rowId = 'waste-transfer-from-homes';
    document.body.innerHTML = `
      <div data-reglament-calculator>
        <input
          type="number"
          data-reglament-field="volume"
          data-reglament-row-id="${rowId}"
          data-reglament-baseline="6201.6"
          value="6201.6"
        />
        <input
          type="number"
          data-reglament-field="frequency"
          data-reglament-row-id="${rowId}"
          data-reglament-baseline="365"
          value="365"
        />
        <input
          type="text"
          data-reglament-field="primary_salary"
          data-reglament-row-id="${rowId}"
          data-reglament-baseline="3418555.1"
          value="${formatReglamentInputNumber(3_418_555.1)}"
        />
        <span data-reglament-row-annual="${rowId}"></span>
      </div>
    `;
    const root = document.querySelector('[data-reglament-calculator]');
    const volumeInput = document.querySelector(
      '[data-reglament-field="volume"]',
    );
    const frequencyInput = document.querySelector(
      '[data-reglament-field="frequency"]',
    );
    const primarySalaryInput = document.querySelector(
      '[data-reglament-field="primary_salary"]',
    );
    const rowAnnual = document.querySelector('[data-reglament-row-annual]');

    if (
      !(root instanceof HTMLElement) ||
      !(volumeInput instanceof HTMLInputElement) ||
      !(frequencyInput instanceof HTMLInputElement) ||
      !(primarySalaryInput instanceof HTMLInputElement) ||
      !(rowAnnual instanceof HTMLElement)
    ) {
      throw new Error('Missing breakdown sync calculator fixture nodes');
    }

    hydrateReglamentCalculator(root);

    volumeInput.value = '3100.8';
    volumeInput.dispatchEvent(new Event('input', { bubbles: true }));

    const volumeResultRow = findCalculatedRow(
      calculateReglamentCalculatorState([
        {
          rowId,
          key: 'volume',
          baseline: 6_201.6,
          value: '3100.8',
        },
      ]),
      rowId,
    );

    expect(primarySalaryInput.value).toBe(
      formatReglamentInputNumber(volumeResultRow.breakdown.primary_salary),
    );

    frequencyInput.value = '182.5';
    frequencyInput.dispatchEvent(new Event('input', { bubbles: true }));

    const volumeAndFrequencyResultRow = findCalculatedRow(
      calculateReglamentCalculatorState([
        {
          rowId,
          key: 'volume',
          baseline: 6_201.6,
          value: '3100.8',
        },
        {
          rowId,
          key: 'frequency',
          baseline: 365,
          value: '182.5',
        },
      ]),
      rowId,
    );

    expect(primarySalaryInput.value).toBe(
      formatReglamentInputNumber(
        volumeAndFrequencyResultRow.breakdown.primary_salary,
      ),
    );
    expect(rowAnnual.textContent).toBe(
      formatReglamentAnnualMoney(volumeAndFrequencyResultRow.annual_gross),
    );
  });

  it('renders fixed annual price changes from row details with short sotka unit', () => {
    document.body.innerHTML = `
      <div data-reglament-calculator>
        <details open>
          <summary>Детали расчета и источники</summary>
          <input
            type="number"
            data-reglament-field="fixed_price"
            data-reglament-row-id="lighting-electricity"
            data-reglament-baseline="1473084"
            value="1573084"
          />
        </details>
        <span data-reglament-current-tariff></span>
        <span data-reglament-section-tariff="lighting-power"></span>
      </div>
    `;
    const root = document.querySelector('[data-reglament-calculator]');

    if (!(root instanceof HTMLElement)) {
      throw new Error('Missing calculator fixture root');
    }

    hydrateReglamentCalculator(root);

    expect(
      document.querySelector('[data-reglament-current-tariff]')?.textContent,
    ).toMatchInlineSnapshot(`"902,48 ₽/сотка"`);
    expect(
      document.querySelector('[data-reglament-section-tariff]')?.textContent,
    ).toMatchInlineSnapshot(`"48,27 ₽/сотка"`);
  });

  it('updates a single sticky current tariff and shows reset only while dirty', () => {
    document.body.innerHTML = `
      <div data-reglament-calculator>
        <input
          type="number"
          data-reglament-field="fixed_price"
          data-reglament-row-id="lighting-electricity"
          data-reglament-baseline="1473084"
          value="1473084"
        />
        <button type="button" data-reglament-reset>Сброс</button>
        <span data-reglament-current-original-tariff hidden></span>
        <span data-reglament-current-tariff-arrow hidden></span>
        <strong
          data-reglament-current-tariff
          data-reglament-current-tariff-tone
        ></strong>
      </div>
    `;
    const root = document.querySelector('[data-reglament-calculator]');
    const input = document.querySelector('input');
    const reset = document.querySelector('[data-reglament-reset]');
    const originalTariff = document.querySelector(
      '[data-reglament-current-original-tariff]',
    );
    const arrow = document.querySelector(
      '[data-reglament-current-tariff-arrow]',
    );
    const stickyTariff = document.querySelector(
      '[data-reglament-current-tariff]',
    );

    if (
      !(root instanceof HTMLElement) ||
      !(input instanceof HTMLInputElement) ||
      !(reset instanceof HTMLButtonElement) ||
      !(originalTariff instanceof HTMLElement) ||
      !(arrow instanceof HTMLElement) ||
      !(stickyTariff instanceof HTMLElement)
    ) {
      throw new Error('Missing sticky calculator fixture nodes');
    }

    hydrateReglamentCalculator(root);

    expect(reset.hidden).toBe(true);
    expect(originalTariff.hidden).toBe(true);
    expect(arrow.hidden).toBe(true);
    expect(stickyTariff.dataset.reglamentDeltaTone).toBeUndefined();

    input.value = '1573084';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    expect(originalTariff.textContent).toMatchInlineSnapshot(`"902,07"`);
    expect(originalTariff.hidden).toBe(false);
    expect(arrow.textContent).toBe('→');
    expect(arrow.hidden).toBe(false);
    expect(stickyTariff.textContent).toMatchInlineSnapshot(`"902,48 ₽/сотка"`);
    expect(stickyTariff.dataset.reglamentDeltaTone).toBe('positive');
    expect(reset.hidden).toBe(false);

    input.value = '1373084';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    expect(originalTariff.hidden).toBe(false);
    expect(arrow.hidden).toBe(false);
    expect(stickyTariff.dataset.reglamentDeltaTone).toBe('negative');

    reset.click();

    expect(input.value).toBe(formatReglamentInputNumber(1_473_084));
    expect(stickyTariff.textContent).toMatchInlineSnapshot(`"902,07 ₽/сотка"`);
    expect(stickyTariff.dataset.reglamentDeltaTone).toBeUndefined();
    expect(originalTariff.hidden).toBe(true);
    expect(arrow.hidden).toBe(true);
    expect(reset.hidden).toBe(true);
  });

  it('accepts readable grouped money input and resets to grouped baseline', () => {
    document.body.innerHTML = `
      <div data-reglament-calculator>
        <input
          type="text"
          data-reglament-field="fixed_price"
          data-reglament-row-id="lighting-electricity"
          data-reglament-baseline="1473084"
          value="${formatReglamentInputNumber(1_473_084)}"
        />
        <button type="button" data-reglament-reset>Сброс</button>
        <strong data-reglament-current-tariff></strong>
      </div>
    `;
    const root = document.querySelector('[data-reglament-calculator]');
    const input = document.querySelector('input');
    const reset = document.querySelector('[data-reglament-reset]');
    const stickyTariff = document.querySelector(
      '[data-reglament-current-tariff]',
    );

    if (
      !(root instanceof HTMLElement) ||
      !(input instanceof HTMLInputElement) ||
      !(reset instanceof HTMLButtonElement) ||
      !(stickyTariff instanceof HTMLElement)
    ) {
      throw new Error('Missing grouped money calculator fixture nodes');
    }

    hydrateReglamentCalculator(root);
    input.value = formatReglamentInputNumber(1_573_084);
    input.dispatchEvent(new Event('input', { bubbles: true }));

    expect(stickyTariff.textContent).toMatchInlineSnapshot(`"902,48 ₽/сотка"`);
    expect(reset.hidden).toBe(false);

    reset.click();

    expect(input.value).toBe(formatReglamentInputNumber(1_473_084));
    expect(stickyTariff.textContent).toMatchInlineSnapshot(`"902,07 ₽/сотка"`);
    expect(reset.hidden).toBe(true);
  });

  it('renders changed row contribution in the tariff cell with delta tone', () => {
    const rowId = 'cleaning-winter-mechanized';
    document.body.innerHTML = `
      <div data-reglament-calculator>
        <input
          type="number"
          data-reglament-field="frequency"
          data-reglament-row-id="${rowId}"
          data-reglament-baseline="116"
          value="100"
        />
        <span data-reglament-row-tariff="${rowId}"></span>
      </div>
    `;
    const root = document.querySelector('[data-reglament-calculator]');
    const rowTariff = document.querySelector('[data-reglament-row-tariff]');

    if (!(root instanceof HTMLElement) || !(rowTariff instanceof HTMLElement)) {
      throw new Error('Missing row tariff fixture nodes');
    }

    hydrateReglamentCalculator(root);

    const expectedRow = findCalculatedRow(
      calculateReglamentCalculatorState([
        {
          rowId,
          key: 'frequency',
          baseline: 116,
          value: '100',
        },
      ]),
      rowId,
    );

    expect(rowTariff.textContent).toBe(
      formatReglamentTariffValue(expectedRow.tariff_per_sotka_month),
    );
    expect(rowTariff.dataset.reglamentDeltaTone).toBe('negative');
  });

  it('preserves the row title used as a checkbox description', () => {
    document.body.innerHTML = `
      <div data-reglament-calculator>
        <input
          type="checkbox"
          checked
          aria-describedby="reglament-row-title-lighting"
          data-reglament-field="enabled"
          data-reglament-row-id="lighting"
          data-reglament-baseline="true"
        />
        <h4 id="reglament-row-title-lighting">Освещение территории</h4>
      </div>
    `;
    const root = document.querySelector('[data-reglament-calculator]');
    const checkbox = document.querySelector('input');
    const title = document.querySelector('h4');

    if (
      !(root instanceof HTMLElement) ||
      !(checkbox instanceof HTMLInputElement) ||
      !(title instanceof HTMLElement)
    ) {
      throw new Error('Missing checkbox description fixture nodes');
    }

    hydrateReglamentCalculator(root);

    expect({
      describedBy: checkbox.getAttribute('aria-describedby'),
      titleHidden: title.hidden,
      titleText: title.textContent,
    }).toMatchInlineSnapshot(`
      {
        "describedBy": "reglament-row-title-lighting",
        "titleHidden": false,
        "titleText": "Освещение территории",
      }
    `);
  });

  it('shows the same accessible error for negative volume, frequency and rate', () => {
    const rowId = 'cleaning-winter-mechanized';
    document.body.innerHTML = `
      <div data-reglament-calculator>
        ${[
          ['volume', '81778'],
          ['frequency', '116'],
          ['rate', '2.26'],
        ]
          .map(
            ([key, baseline]) => `
              <label>
                <span>
                  <input
                    type="text"
                    data-reglament-field="${key}"
                    data-reglament-row-id="${rowId}"
                    data-reglament-baseline="${baseline}"
                    aria-describedby="reglament-error-${rowId}-${key}"
                    value="${baseline}"
                  />
                </span>
                <span
                  id="reglament-error-${rowId}-${key}"
                  aria-live="polite"
                  hidden
                ></span>
              </label>
            `,
          )
          .join('')}
        <strong data-reglament-current-tariff></strong>
      </div>
    `;
    const root = document.querySelector('[data-reglament-calculator]');
    const inputs = Array.from(document.querySelectorAll('input'));
    const [volumeInput, frequencyInput, rateInput] = inputs;

    if (
      !(root instanceof HTMLElement) ||
      !volumeInput ||
      !frequencyInput ||
      !rateInput
    ) {
      throw new Error('Missing invalid calculator fixture nodes');
    }

    hydrateReglamentCalculator(root);
    volumeInput.value = '-100';
    volumeInput.dispatchEvent(new Event('input', { bubbles: true }));
    frequencyInput.value = '−1';
    frequencyInput.dispatchEvent(new Event('change', { bubbles: true }));
    rateInput.value = '-0,5';
    rateInput.dispatchEvent(new Event('input', { bubbles: true }));

    const expectedMessage =
      'Введите 0 или положительное число. Расчет не учитывает это значение.';

    inputs.forEach((input) => {
      const error = document.getElementById(
        input.getAttribute('aria-describedby') ?? '',
      );

      expect({
        ariaInvalid: input.getAttribute('aria-invalid'),
        validationMessage: input.validationMessage,
        errorHidden: error?.hidden,
        errorText: error?.textContent,
      }).toEqual({
        ariaInvalid: 'true',
        validationMessage: expectedMessage,
        errorHidden: false,
        errorText: expectedMessage,
      });
    });
    expect(
      document.querySelector('[data-reglament-current-tariff]')?.textContent,
    ).toMatchInlineSnapshot(`"902,07 ₽/сотка"`);

    volumeInput.value = '';
    volumeInput.dispatchEvent(new Event('input', { bubbles: true }));

    expect({
      ariaInvalid: volumeInput.getAttribute('aria-invalid'),
      validationMessage: volumeInput.validationMessage,
      errorHidden: document.getElementById(
        volumeInput.getAttribute('aria-describedby') ?? '',
      )?.hidden,
    }).toMatchInlineSnapshot(`
      {
        "ariaInvalid": null,
        "errorHidden": true,
        "validationMessage": "",
      }
    `);

    volumeInput.value = '81 000,5';
    volumeInput.dispatchEvent(new Event('change', { bubbles: true }));

    expect(volumeInput.getAttribute('aria-invalid')).toBeNull();
    expect(volumeInput.validationMessage).toBe('');
    expect(
      document.querySelector('[data-reglament-current-tariff]')?.textContent,
    ).not.toBe('902,07 ₽/сотка');
  });

  it('does not rescan calculator DOM on input after a page replacement', () => {
    const calculator = `
      <div data-reglament-calculator>
        <input
          type="number"
          data-reglament-field="fixed_price"
          data-reglament-row-id="lighting-electricity"
          data-reglament-baseline="1473084"
          value="1473084"
        />
        <strong data-reglament-current-tariff></strong>
      </div>
    `;
    document.body.innerHTML = calculator;

    const firstRoot = document.querySelector('[data-reglament-calculator]');

    if (!(firstRoot instanceof HTMLElement)) {
      throw new Error('Missing first calculator fixture root');
    }

    hydrateReglamentCalculator(firstRoot);
    document.body.innerHTML = calculator;

    const root = document.querySelector('[data-reglament-calculator]');
    const input = document.querySelector('input');
    const currentTariff = document.querySelector(
      '[data-reglament-current-tariff]',
    );

    if (
      !(root instanceof HTMLElement) ||
      !(input instanceof HTMLInputElement) ||
      !(currentTariff instanceof HTMLElement)
    ) {
      throw new Error('Missing replacement calculator fixture nodes');
    }

    hydrateReglamentCalculator(root);
    const querySelectorAll = vi.spyOn(root, 'querySelectorAll');

    input.value = '1573084';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    expect({
      fullDomSearches: querySelectorAll.mock.calls.length,
      tariff: currentTariff.textContent,
    }).toMatchInlineSnapshot(`
      {
        "fullDomSearches": 0,
        "tariff": "902,48 ₽/сотка",
      }
    `);
  });
});
