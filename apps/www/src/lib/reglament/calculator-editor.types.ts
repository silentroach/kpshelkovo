import type { EditableFieldKey } from './schema';

export interface ReglamentEditorControl {
  readonly key: Exclude<EditableFieldKey, 'enabled'>;
  readonly label: string;
  readonly value: number;
  readonly unit?: string;
}

export interface ReglamentEditorRowConfig {
  readonly id: string;
  readonly breakdown: readonly ReglamentEditorControl[];
  readonly expert: readonly ReglamentEditorControl[];
}

export interface ReglamentEditorConfig {
  readonly rows: readonly ReglamentEditorRowConfig[];
}
