import { calculateEstimate } from './calculate';
import {
  type CalculatedEstimate,
  type CalculatedEstimateRow,
  type EstimateCalculationChanges,
  type EstimateCalculationInput,
  type EstimateRowChange,
} from './calculate.types';
import {
  formatReglamentInputNumber,
  formatReglamentAnnualMoney,
  formatReglamentMoney,
  formatReglamentMoneyDelta,
  formatReglamentNumber,
  formatReglamentTariff,
  formatReglamentTariffValue,
  parseReglamentNumberInput,
} from './format';
import {
  EDITABLE_FIELD_KEYS,
  type CostBreakdown,
  type EditableFieldKey,
} from './schema';

export interface ReglamentCalculatorFieldState {
  readonly rowId: string;
  readonly key: EditableFieldKey;
  readonly baseline: boolean | number;
  readonly value: boolean | number | string;
  readonly forceChange?: boolean;
}

type NumberEditableFieldKey = Exclude<EditableFieldKey, 'enabled'>;
type BreakdownFieldKey = keyof CostBreakdown;
type EditableBreakdownFieldKey = Extract<
  NumberEditableFieldKey,
  BreakdownFieldKey
>;
type MutableEstimateRowChange = {
  -readonly [Key in keyof EstimateRowChange]?: EstimateRowChange[Key];
};

const ROOT_SELECTOR = '[data-reglament-calculator]';
const FIELD_ATTRIBUTE = 'data-reglament-field';
const CALCULATION_INPUT_ATTRIBUTE = 'data-reglament-calculation-input';
const RESET_ATTRIBUTE = 'data-reglament-reset';
const CURRENT_TARIFF_ATTRIBUTE = 'data-reglament-current-tariff';
const CURRENT_TARIFF_TONE_ATTRIBUTE = 'data-reglament-current-tariff-tone';
const CURRENT_ORIGINAL_TARIFF_ATTRIBUTE =
  'data-reglament-current-original-tariff';
const CURRENT_TARIFF_ARROW_ATTRIBUTE = 'data-reglament-current-tariff-arrow';
const CURRENT_ANNUAL_ATTRIBUTE = 'data-reglament-current-annual';
const CURRENT_DELTA_ATTRIBUTE = 'data-reglament-current-delta';
const SECTION_TARIFF_ATTRIBUTE = 'data-reglament-section-tariff';
const SECTION_ANNUAL_ATTRIBUTE = 'data-reglament-section-annual';
const SECTION_DELTA_ATTRIBUTE = 'data-reglament-section-delta';
const ROW_TARIFF_ATTRIBUTE = 'data-reglament-row-tariff';
const ROW_ANNUAL_ATTRIBUTE = 'data-reglament-row-annual';
const ROW_BREAKDOWN_ATTRIBUTE = 'data-reglament-row-breakdown';
const BREAKDOWN_FIELD_ATTRIBUTE = 'data-reglament-breakdown-field';
const EDITOR_DETAILS_SELECTOR = 'details[data-reglament-editor-row]';
const STATIC_ELEMENT_ATTRIBUTES = [
  CURRENT_TARIFF_ATTRIBUTE,
  CURRENT_TARIFF_TONE_ATTRIBUTE,
  CURRENT_ORIGINAL_TARIFF_ATTRIBUTE,
  CURRENT_TARIFF_ARROW_ATTRIBUTE,
  CURRENT_ANNUAL_ATTRIBUTE,
  CURRENT_DELTA_ATTRIBUTE,
] as const;
const ID_ELEMENT_ATTRIBUTES = [
  SECTION_TARIFF_ATTRIBUTE,
  SECTION_ANNUAL_ATTRIBUTE,
  SECTION_DELTA_ATTRIBUTE,
  ROW_TARIFF_ATTRIBUTE,
  ROW_ANNUAL_ATTRIBUTE,
] as const;
const CACHED_ELEMENT_ATTRIBUTES = [
  FIELD_ATTRIBUTE,
  CALCULATION_INPUT_ATTRIBUTE,
  RESET_ATTRIBUTE,
  ...STATIC_ELEMENT_ATTRIBUTES,
  ...ID_ELEMENT_ATTRIBUTES,
  ROW_BREAKDOWN_ATTRIBUTE,
] as const;
const CACHED_ELEMENT_SELECTOR = CACHED_ELEMENT_ATTRIBUTES.map(
  (attribute) => `[${attribute}]`,
).join(',');
const TARIFF_ARROW_TEXT = '→';
const INVALID_NUMBER_MESSAGE =
  'Введите 0 или положительное число. Расчет не учитывает это значение.';

const EDITABLE_FIELD_KEY_SET: ReadonlySet<string> = new Set(
  EDITABLE_FIELD_KEYS,
);
const NUMBER_EDITABLE_FIELD_KEYS = EDITABLE_FIELD_KEYS.filter(
  (key): key is NumberEditableFieldKey => key !== 'enabled',
);
const NUMBER_EDITABLE_FIELD_KEY_SET: ReadonlySet<string> = new Set(
  NUMBER_EDITABLE_FIELD_KEYS,
);
const AUTO_SYNC_BREAKDOWN_FIELD_KEYS = [
  'primary_salary',
  'machinist_salary',
  'machines',
  'materials',
  'contractors',
] as const satisfies readonly EditableBreakdownFieldKey[];
const AUTO_SYNC_BREAKDOWN_FIELD_KEY_SET: ReadonlySet<string> = new Set(
  AUTO_SYNC_BREAKDOWN_FIELD_KEYS,
);
const BREAKDOWN_FIELD_KEYS = [
  'primary_salary',
  'machinist_salary',
  'fot',
  'machines',
  'materials',
  'contractors',
  'insurance',
  'overhead',
  'profit',
  'usn',
  'income',
  'vat',
  'gross',
] as const satisfies readonly BreakdownFieldKey[];

interface ReglamentCalculatorDomIndex {
  calculationInput?: HTMLScriptElement;
  readonly fields: HTMLInputElement[];
  readonly resetButtons: HTMLButtonElement[];
  readonly validationFeedback: Map<HTMLInputElement, HTMLElement>;
  readonly elements: Map<string, HTMLElement[]>;
  readonly breakdownInputs: Map<string, HTMLInputElement[]>;
}

const isEditableFieldKey = (
  value: string | undefined,
): value is EditableFieldKey =>
  value !== undefined && EDITABLE_FIELD_KEY_SET.has(value);

const isNumberEditableFieldKey = (
  value: EditableFieldKey,
): value is NumberEditableFieldKey => NUMBER_EDITABLE_FIELD_KEY_SET.has(value);

const isAutoSyncedBreakdownFieldKey = (
  value: string | undefined,
): value is EditableBreakdownFieldKey =>
  value !== undefined && AUTO_SYNC_BREAKDOWN_FIELD_KEY_SET.has(value);

const toFiniteNumber = (
  value: boolean | number | string,
): number | undefined => {
  if (typeof value === 'boolean') {
    return undefined;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }

  return parseReglamentNumberInput(value);
};

const toNonnegativeFiniteNumber = (
  value: boolean | number | string,
): number | undefined => {
  const parsed = toFiniteNumber(value);

  return parsed !== undefined && parsed >= 0 ? parsed : undefined;
};

const toBoolean = (value: boolean | number | string): boolean | undefined => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return undefined;
};

const getRowChange = (
  rows: Record<string, MutableEstimateRowChange>,
  rowId: string,
): MutableEstimateRowChange => {
  rows[rowId] ??= {};

  return rows[rowId];
};

const setNumberRowChange = (
  rowChange: MutableEstimateRowChange,
  key: NumberEditableFieldKey,
  value: number,
): void => {
  rowChange[key] = value;
};

export const buildReglamentCalculatorChanges = (
  fields: readonly ReglamentCalculatorFieldState[],
): EstimateCalculationChanges => {
  const rows: Record<string, MutableEstimateRowChange> = {};

  for (const field of fields) {
    if (field.key === 'enabled') {
      const baseline = toBoolean(field.baseline);
      const value = toBoolean(field.value);

      if (baseline !== undefined && value !== undefined && value !== baseline) {
        getRowChange(rows, field.rowId).enabled = value;
      }

      continue;
    }

    if (!isNumberEditableFieldKey(field.key)) {
      continue;
    }

    const baseline = toNonnegativeFiniteNumber(field.baseline);
    const value = toNonnegativeFiniteNumber(field.value);

    if (
      baseline !== undefined &&
      value !== undefined &&
      (value !== baseline || field.forceChange === true)
    ) {
      setNumberRowChange(getRowChange(rows, field.rowId), field.key, value);
    }
  }

  return Object.keys(rows).length > 0 ? { rows } : {};
};

export const calculateReglamentCalculatorState = (
  calculationInput: EstimateCalculationInput,
  fields: readonly ReglamentCalculatorFieldState[],
): CalculatedEstimate =>
  calculateEstimate(calculationInput, buildReglamentCalculatorChanges(fields));

const isReglamentCalculatorFieldDirty = (
  field: ReglamentCalculatorFieldState,
): boolean => {
  if (field.key === 'enabled') {
    const baseline = toBoolean(field.baseline);
    const value = toBoolean(field.value);

    return baseline !== undefined && value !== undefined && value !== baseline;
  }

  if (!isNumberEditableFieldKey(field.key)) {
    return false;
  }

  const baseline = toNonnegativeFiniteNumber(field.baseline);
  const value = toNonnegativeFiniteNumber(field.value);

  return (
    baseline !== undefined &&
    (field.forceChange === true || value === undefined || value !== baseline)
  );
};

const deltaTone = (value: number): 'negative' | 'positive' | 'zero' => {
  if (value < 0) {
    return 'negative';
  }

  if (value > 0) {
    return 'positive';
  }

  return 'zero';
};

const indexedElementKey = (...parts: readonly string[]): string =>
  parts.join('\0');

const addIndexedElement = <ElementType extends HTMLElement>(
  index: Map<string, ElementType[]>,
  element: ElementType,
  ...keyParts: readonly string[]
): void => {
  const key = indexedElementKey(...keyParts);
  const elements = index.get(key);

  if (elements) {
    elements.push(element);
    return;
  }

  index.set(key, [element]);
};

const indexAttributeElement = (
  index: Map<string, HTMLElement[]>,
  element: HTMLElement,
  attribute: string,
): void => {
  const value = element.getAttribute(attribute) ?? undefined;

  if (value) {
    addIndexedElement(index, element, attribute, value);
  }
};

const getIndexedElements = (
  index: ReglamentCalculatorDomIndex,
  ...keyParts: readonly string[]
): readonly HTMLElement[] =>
  index.elements.get(indexedElementKey(...keyParts)) ?? [];

const getIndexedBreakdownInputs = (
  index: ReglamentCalculatorDomIndex,
  rowId: string,
  field: EditableBreakdownFieldKey,
): readonly HTMLInputElement[] =>
  index.breakdownInputs.get(indexedElementKey(rowId, field)) ?? [];

const indexReglamentCalculatorDom = (
  index: ReglamentCalculatorDomIndex,
  root: ParentNode,
): void => {
  root.querySelectorAll(CACHED_ELEMENT_SELECTOR).forEach((node) => {
    if (!(node instanceof HTMLElement)) {
      return;
    }

    if (
      node instanceof HTMLScriptElement &&
      node.hasAttribute(CALCULATION_INPUT_ATTRIBUTE)
    ) {
      index.calculationInput = node;
    }

    if (
      node instanceof HTMLInputElement &&
      node.hasAttribute(FIELD_ATTRIBUTE)
    ) {
      index.fields.push(node);

      if (node.type !== 'checkbox') {
        const errorId = node.getAttribute('aria-describedby') ?? undefined;
        const feedback = errorId
          ? node.ownerDocument.getElementById(errorId)
          : undefined;

        if (feedback instanceof HTMLElement) {
          index.validationFeedback.set(node, feedback);
        }
      }

      const rowId = node.dataset.reglamentRowId;
      const field = node.dataset.reglamentField;

      if (rowId && isAutoSyncedBreakdownFieldKey(field)) {
        addIndexedElement(index.breakdownInputs, node, rowId, field);
      }
    }

    if (
      node instanceof HTMLButtonElement &&
      node.hasAttribute(RESET_ATTRIBUTE)
    ) {
      index.resetButtons.push(node);
    }

    STATIC_ELEMENT_ATTRIBUTES.forEach((attribute) => {
      if (node.hasAttribute(attribute)) {
        addIndexedElement(index.elements, node, attribute);
      }
    });
    ID_ELEMENT_ATTRIBUTES.forEach((attribute) => {
      indexAttributeElement(index.elements, node, attribute);
    });

    const breakdownRowId =
      node.getAttribute(ROW_BREAKDOWN_ATTRIBUTE) ?? undefined;
    const breakdownField =
      node.getAttribute(BREAKDOWN_FIELD_ATTRIBUTE) ?? undefined;

    if (breakdownRowId && breakdownField) {
      addIndexedElement(
        index.elements,
        node,
        ROW_BREAKDOWN_ATTRIBUTE,
        breakdownRowId,
        breakdownField,
      );
    }
  });
};

const createReglamentCalculatorDomIndex = (
  root: ParentNode,
): ReglamentCalculatorDomIndex => {
  const index: ReglamentCalculatorDomIndex = {
    fields: [],
    resetButtons: [],
    validationFeedback: new Map(),
    elements: new Map(),
    breakdownInputs: new Map(),
  };

  indexReglamentCalculatorDom(index, root);

  return index;
};

const setText = (elements: readonly HTMLElement[], value: string): void => {
  elements.forEach((element) => {
    element.textContent = value;
  });
};

const setDeltaText = (
  elements: readonly HTMLElement[],
  value: number,
): void => {
  elements.forEach((element) => {
    element.textContent = formatReglamentMoneyDelta(value);
    element.dataset.reglamentDeltaTone = deltaTone(value);
  });
};

const setCurrentTariffText = (
  index: ReglamentCalculatorDomIndex,
  result: CalculatedEstimate,
  officialTariffText: string,
): void => {
  const tone = deltaTone(result.delta_tariff_per_sotka_month);
  const isBaseline = tone === 'zero';

  setText(
    getIndexedElements(index, CURRENT_TARIFF_ATTRIBUTE),
    formatReglamentTariff(result.tariff_per_sotka_month),
  );
  getIndexedElements(index, CURRENT_TARIFF_TONE_ATTRIBUTE).forEach((node) => {
    if (isBaseline) {
      delete node.dataset.reglamentDeltaTone;
      return;
    }

    node.dataset.reglamentDeltaTone = tone;
  });
  getIndexedElements(index, CURRENT_ORIGINAL_TARIFF_ATTRIBUTE).forEach(
    (node) => {
      node.textContent = officialTariffText;
      node.hidden = isBaseline;
    },
  );
  getIndexedElements(index, CURRENT_TARIFF_ARROW_ATTRIBUTE).forEach((node) => {
    node.textContent = TARIFF_ARROW_TEXT;
    node.hidden = isBaseline;
  });
};

const setRowTariffText = (
  index: ReglamentCalculatorDomIndex,
  row: CalculatedEstimateRow,
): void => {
  getIndexedElements(index, ROW_TARIFF_ATTRIBUTE, row.id).forEach((node) => {
    node.textContent = formatReglamentTariffValue(row.tariff_per_sotka_month);
    const tone = deltaTone(row.delta_tariff_per_sotka_month);

    if (tone === 'zero') {
      delete node.dataset.reglamentDeltaTone;
      return;
    }

    node.dataset.reglamentDeltaTone = tone;
  });
};

const setBreakdownInputValue = (
  index: ReglamentCalculatorDomIndex,
  rowId: string,
  field: BreakdownFieldKey,
  value: number,
): void => {
  if (!isAutoSyncedBreakdownFieldKey(field)) {
    return;
  }

  getIndexedBreakdownInputs(index, rowId, field).forEach((node) => {
    if (
      node.dataset.reglamentManualValue !== 'true' &&
      (typeof document === 'undefined' || document.activeElement !== node)
    ) {
      node.value = formatReglamentInputNumber(value);
    }
  });
};

const renderRow = (
  index: ReglamentCalculatorDomIndex,
  row: CalculatedEstimateRow,
): void => {
  setText(
    getIndexedElements(index, ROW_ANNUAL_ATTRIBUTE, row.id),
    formatReglamentAnnualMoney(row.annual_gross),
  );
  setRowTariffText(index, row);
  BREAKDOWN_FIELD_KEYS.forEach((field) => {
    const value = row.breakdown[field];

    setText(
      getIndexedElements(index, ROW_BREAKDOWN_ATTRIBUTE, row.id, field),
      formatReglamentMoney(value),
    );
    setBreakdownInputValue(index, row.id, field, value);
  });

  row.children?.forEach((child) => renderRow(index, child));
};

const renderReglamentCalculator = (
  index: ReglamentCalculatorDomIndex,
  result: CalculatedEstimate,
  officialTariffText: string,
): void => {
  setCurrentTariffText(index, result, officialTariffText);
  setText(
    getIndexedElements(index, CURRENT_ANNUAL_ATTRIBUTE),
    formatReglamentAnnualMoney(result.annual_gross),
  );
  setDeltaText(
    getIndexedElements(index, CURRENT_DELTA_ATTRIBUTE),
    result.delta_tariff_per_sotka_month,
  );

  for (const section of result.sections) {
    setText(
      getIndexedElements(index, SECTION_TARIFF_ATTRIBUTE, section.id),
      formatReglamentTariff(section.tariff_per_sotka_month),
    );
    setText(
      getIndexedElements(index, SECTION_ANNUAL_ATTRIBUTE, section.id),
      formatReglamentAnnualMoney(section.annual_gross),
    );
    setDeltaText(
      getIndexedElements(index, SECTION_DELTA_ATTRIBUTE, section.id),
      section.delta_tariff_per_sotka_month,
    );
    section.rows.forEach((row) => renderRow(index, row));
  }
};

const readReglamentCalculatorField = (
  input: HTMLInputElement,
): ReglamentCalculatorFieldState | undefined => {
  const rowId = input.dataset.reglamentRowId;
  const key = input.dataset.reglamentField;

  if (!rowId || !isEditableFieldKey(key)) {
    return undefined;
  }

  if (key === 'enabled') {
    return {
      rowId,
      key,
      baseline: input.dataset.reglamentBaseline === 'true',
      value: input.checked,
    };
  }

  const baseline = toFiniteNumber(input.dataset.reglamentBaseline ?? '');
  const isManualBreakdownOverride =
    isAutoSyncedBreakdownFieldKey(key) &&
    input.dataset.reglamentManualValue === 'true';

  return baseline === undefined
    ? undefined
    : {
        rowId,
        key,
        baseline,
        value:
          isAutoSyncedBreakdownFieldKey(key) && !isManualBreakdownOverride
            ? baseline
            : input.value,
        forceChange: isManualBreakdownOverride,
      };
};

const readReglamentCalculatorFields = (
  index: ReglamentCalculatorDomIndex,
): readonly ReglamentCalculatorFieldState[] =>
  index.fields.flatMap((node) => {
    const field = readReglamentCalculatorField(node);

    return field ? [field] : [];
  });

const resetReglamentCalculatorFields = (
  index: ReglamentCalculatorDomIndex,
): void => {
  index.fields.forEach((node) => {
    if (node.type === 'checkbox') {
      node.checked = node.dataset.reglamentBaseline === 'true';
      return;
    }

    delete node.dataset.reglamentManualValue;

    const baseline = toFiniteNumber(node.dataset.reglamentBaseline ?? '');

    node.value =
      baseline === undefined ? '' : formatReglamentInputNumber(baseline);
  });
};

const formatReglamentInput = (input: HTMLInputElement): void => {
  if (input.type === 'checkbox') {
    return;
  }

  const value = toFiniteNumber(input.value);

  if (value !== undefined) {
    input.value = formatReglamentInputNumber(value);
  }
};

const reglamentInputError = (input: HTMLInputElement): string | undefined =>
  toNonnegativeFiniteNumber(input.value) === undefined
    ? INVALID_NUMBER_MESSAGE
    : undefined;

const renderReglamentInputValidation = (
  index: ReglamentCalculatorDomIndex,
): void => {
  index.fields.forEach((node) => {
    if (node.type === 'checkbox') {
      return;
    }

    const error = reglamentInputError(node);
    const feedback = index.validationFeedback.get(node);

    node.setCustomValidity(error ?? '');

    if (error) {
      node.setAttribute('aria-invalid', 'true');
    } else {
      node.removeAttribute('aria-invalid');
    }

    if (feedback instanceof HTMLElement) {
      feedback.hidden = !error;
      feedback.textContent = error ?? '';
    }
  });
};

const setResetVisibility = (
  index: ReglamentCalculatorDomIndex,
  isDirty: boolean,
): void => {
  index.resetButtons.forEach((node) => {
    node.hidden = !isDirty;
  });
};

const markManualBreakdownInput = (input: HTMLInputElement): void => {
  if (isAutoSyncedBreakdownFieldKey(input.dataset.reglamentField)) {
    input.dataset.reglamentManualValue = 'true';
  }
};

const readReglamentCalculationInput = (
  index: ReglamentCalculatorDomIndex,
): EstimateCalculationInput => {
  const data = index.calculationInput;

  if (!data?.textContent) {
    throw new Error('Missing reglament calculator input');
  }

  return JSON.parse(data.textContent) as EstimateCalculationInput;
};

export const hydrateReglamentCalculator = (
  root: HTMLElement,
  calculationInput?: EstimateCalculationInput,
): void => {
  const index = createReglamentCalculatorDomIndex(root);
  const input = calculationInput ?? readReglamentCalculationInput(index);
  const officialTariffText = formatReglamentNumber(
    input.baseline.tariff_per_sotka_month,
  );
  const render = (): void => {
    renderReglamentInputValidation(index);
    const fields = readReglamentCalculatorFields(index);

    renderReglamentCalculator(
      index,
      calculateReglamentCalculatorState(input, fields),
      officialTariffText,
    );
    setResetVisibility(index, fields.some(isReglamentCalculatorFieldDirty));
  };

  if (root.dataset.reglamentCalculatorHydrated === 'true') {
    render();
    return;
  }

  root.dataset.reglamentCalculatorHydrated = 'true';
  let editorHydration: Promise<void> | undefined;
  const hydrateEditors = async (): Promise<void> => {
    const { hydrateReglamentEditors } = await import('./calculator-editor');
    hydrateReglamentEditors(root, (editor) => {
      indexReglamentCalculatorDom(index, editor);
      render();
    });
    root.removeEventListener('focusin', handleEditorIntent);
    root.removeEventListener('pointerover', handleEditorIntent);
    root.removeEventListener('toggle', handleEditorToggle, true);
  };
  const loadEditors = (): void => {
    editorHydration ??= hydrateEditors();
  };
  const handleEditorIntent = (event: Event): void => {
    if (
      event.target instanceof Element &&
      event.target.closest(EDITOR_DETAILS_SELECTOR)
    ) {
      loadEditors();
    }
  };
  const handleEditorToggle = (event: Event): void => {
    if (
      event.target instanceof HTMLDetailsElement &&
      event.target.matches(EDITOR_DETAILS_SELECTOR) &&
      event.target.open
    ) {
      loadEditors();
    }
  };
  root.addEventListener('focusin', handleEditorIntent);
  root.addEventListener('pointerover', handleEditorIntent);
  root.addEventListener('toggle', handleEditorToggle, true);

  if (root.querySelector(`${EDITOR_DETAILS_SELECTOR}[open]`)) {
    loadEditors();
  }

  root.addEventListener('input', (event) => {
    if (event.target instanceof HTMLInputElement) {
      markManualBreakdownInput(event.target);
      render();
    }
  });
  root.addEventListener('change', (event) => {
    if (event.target instanceof HTMLInputElement) {
      markManualBreakdownInput(event.target);
      render();
    }
  });
  root.addEventListener(
    'blur',
    (event) => {
      if (event.target instanceof HTMLInputElement) {
        formatReglamentInput(event.target);
      }
    },
    true,
  );
  index.resetButtons.forEach((node) => {
    node.addEventListener('click', () => {
      resetReglamentCalculatorFields(index);
      render();
    });
  });

  render();
};

export const hydrateReglamentCalculators = (scope?: ParentNode): void => {
  const rootScope =
    scope ?? (typeof document === 'undefined' ? undefined : document);

  if (!rootScope) {
    return;
  }

  rootScope.querySelectorAll(ROOT_SELECTOR).forEach((root) => {
    if (root instanceof HTMLElement) {
      hydrateReglamentCalculator(root);
    }
  });
};
