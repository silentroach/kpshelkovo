import type {
  ReglamentEditorConfig,
  ReglamentEditorControl,
  ReglamentEditorRowConfig,
} from './calculator-editor.types';
import { formatReglamentInputNumber } from './format';

const CONFIG_SELECTOR = '[data-reglament-editor-config]';
const DETAILS_SELECTOR = 'details[data-reglament-editor-row]';
const EDITOR_TEMPLATE_SELECTOR = '[data-reglament-editor-template]';
const INLINE_CONTROL_TEMPLATE_SELECTOR =
  '[data-reglament-inline-control-template]';
const EXPERT_CONTROL_TEMPLATE_SELECTOR =
  '[data-reglament-expert-control-template]';

const inputErrorId = (rowId: string, key: string): string =>
  `reglament-error-${rowId}-${key}`;
const formatInputUnit = (unit: string): string =>
  unit === '₽/год' ? '₽' : unit;

const cloneTemplateElement = (
  root: ParentNode,
  selector: string,
): HTMLElement => {
  const template = root.querySelector(selector);

  if (!(template instanceof HTMLTemplateElement)) {
    throw new Error(`Missing reglament editor template: ${selector}`);
  }

  const element = template.content.firstElementChild?.cloneNode(true);

  if (!(element instanceof HTMLElement)) {
    throw new Error(`Empty reglament editor template: ${selector}`);
  }

  return element;
};

const configureControl = (
  controlElement: HTMLElement,
  rowId: string,
  rowTitle: string,
  control: ReglamentEditorControl,
): void => {
  const input = controlElement.querySelector('input');
  const error = controlElement.querySelector('[data-reglament-control-error]');
  const accessibleLabel = controlElement.querySelector(
    '[data-reglament-control-label]',
  );
  const visibleLabel = controlElement.querySelector(
    '[data-reglament-control-visible-label]',
  );
  const unit = controlElement.querySelector('[data-reglament-control-unit]');

  if (!(input instanceof HTMLInputElement) || !(error instanceof HTMLElement)) {
    throw new Error('Invalid reglament editor control template');
  }

  const label = `${rowTitle}: ${control.label}`;
  const errorId = inputErrorId(rowId, control.key);

  input.value = formatReglamentInputNumber(control.value);
  input.setAttribute('aria-label', label);
  input.setAttribute('aria-describedby', errorId);
  input.dataset.reglamentField = control.key;
  input.dataset.reglamentRowId = rowId;
  input.dataset.reglamentBaseline = String(control.value);
  error.id = errorId;

  if (accessibleLabel instanceof HTMLElement) {
    accessibleLabel.textContent = label;
  }

  if (visibleLabel instanceof HTMLElement) {
    visibleLabel.textContent = control.label;
  }

  if (unit instanceof HTMLElement) {
    if (control.unit) {
      unit.textContent = formatInputUnit(control.unit);
    } else {
      unit.remove();
    }
  }
};

const createControl = (
  root: ParentNode,
  templateSelector: string,
  rowId: string,
  rowTitle: string,
  control: ReglamentEditorControl,
): HTMLElement => {
  const controlElement = cloneTemplateElement(root, templateSelector);
  configureControl(controlElement, rowId, rowTitle, control);

  return controlElement;
};

const createBreakdownValue = (
  root: ParentNode,
  rowId: string,
  rowTitle: string,
  field: string,
  control?: ReglamentEditorControl,
): HTMLElement => {
  if (control) {
    return createControl(
      root,
      INLINE_CONTROL_TEMPLATE_SELECTOR,
      rowId,
      rowTitle,
      control,
    );
  }

  const value = document.createElement('span');
  value.className = 'block pt-1.5';
  value.dataset.reglamentRowBreakdown = rowId;
  value.dataset.reglamentBreakdownField = field;

  return value;
};

const createEditor = (
  root: ParentNode,
  rowTitle: string,
  config: ReglamentEditorRowConfig,
): HTMLElement => {
  const editor = cloneTemplateElement(root, EDITOR_TEMPLATE_SELECTOR);
  const controlsByKey = new Map<string, ReglamentEditorControl>(
    config.breakdown.map((control) => [control.key, control]),
  );

  editor.querySelectorAll('[data-reglament-breakdown-row]').forEach((row) => {
    if (!(row instanceof HTMLElement)) {
      return;
    }

    const field = row.dataset.reglamentBreakdownRow;
    const value = row.querySelector('[data-reglament-breakdown-value]');

    if (!field || !(value instanceof HTMLElement)) {
      return;
    }

    value.append(
      createBreakdownValue(
        root,
        config.id,
        rowTitle,
        field,
        controlsByKey.get(field),
      ),
    );
  });

  const expertFields = editor.querySelector('[data-reglament-expert-fields]');
  const expertList = editor.querySelector(
    '[data-reglament-expert-fields-list]',
  );

  if (
    !(expertFields instanceof HTMLElement) ||
    !(expertList instanceof HTMLElement)
  ) {
    throw new Error('Invalid reglament editor template');
  }

  if (config.expert.length === 0) {
    expertFields.remove();
  } else {
    config.expert.forEach((control) => {
      expertList.append(
        createControl(
          root,
          EXPERT_CONTROL_TEMPLATE_SELECTOR,
          config.id,
          rowTitle,
          control,
        ),
      );
    });
  }

  return editor;
};

const readEditorConfig = (
  root: ParentNode,
): ReglamentEditorConfig | undefined => {
  const data = root.querySelector(CONFIG_SELECTOR);

  if (!(data instanceof HTMLScriptElement) || !data.textContent) {
    return undefined;
  }

  return JSON.parse(data.textContent) as ReglamentEditorConfig;
};

export const hydrateReglamentEditors = (
  root: HTMLElement,
  onEditorCreated: (editor: HTMLElement) => void,
): void => {
  const config = readEditorConfig(root);

  if (!config) {
    return;
  }

  const rows = new Map(config.rows.map((row) => [row.id, row]));

  root.querySelectorAll(DETAILS_SELECTOR).forEach((node) => {
    if (
      !(node instanceof HTMLDetailsElement) ||
      node.dataset.reglamentEditorHydrated === 'true'
    ) {
      return;
    }

    const rowId = node.dataset.reglamentEditorRow;
    const titleId = node.dataset.reglamentEditorTitleId;
    const host = node.querySelector('[data-reglament-editor-host]');
    const row = rowId ? rows.get(rowId) : undefined;
    const title = titleId
      ? node.ownerDocument.getElementById(titleId)?.textContent?.trim()
      : undefined;

    if (!row || !title || !(host instanceof HTMLElement)) {
      return;
    }

    const render = (): void => {
      if (!node.open || host.childElementCount > 0) {
        return;
      }

      const editor = createEditor(root, title, row);
      host.append(editor);
      onEditorCreated(editor);
    };

    node.dataset.reglamentEditorHydrated = 'true';
    node.addEventListener('toggle', render);
    render();
  });
};
