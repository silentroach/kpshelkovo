export type ReglamentCalculatorControllerModule = Pick<
  typeof import('./calculator-controller'),
  'hydrateReglamentCalculator'
>;

export type ReglamentCalculatorDetailsModule = Pick<
  typeof import('./calculator-details'),
  'hydrateReglamentCalculator'
>;

export type ReglamentCalculatorControllerLoader =
  () => Promise<ReglamentCalculatorControllerModule>;
export type ReglamentCalculatorDetailsLoader =
  () => Promise<ReglamentCalculatorDetailsModule>;
