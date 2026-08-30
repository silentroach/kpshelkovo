export type ReglamentCalculatorControllerModule = Pick<
  typeof import('./calculator-controller'),
  'hydrateReglamentCalculator'
>;

export type ReglamentCalculatorEditorModule = Pick<
  typeof import('./calculator-editor'),
  'hydrateReglamentEditors'
>;

export type ReglamentCalculatorControllerLoader =
  () => Promise<ReglamentCalculatorControllerModule>;
export type ReglamentCalculatorEditorLoader =
  () => Promise<ReglamentCalculatorEditorModule>;
