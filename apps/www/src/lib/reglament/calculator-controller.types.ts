import type { EditableFieldKey } from './schema';

export interface ReglamentCalculatorFieldState {
  readonly rowId: string;
  readonly key: EditableFieldKey;
  readonly baseline: boolean | number;
  readonly value: boolean | number | string;
  readonly forceChange?: boolean;
}

export interface ReglamentCalculatorRuntime {
  readonly registerEditor: (editor: HTMLElement) => void;
  readonly render: () => void;
}
