import type {
  ReglamentCalculatorControllerLoader,
  ReglamentCalculatorControllerModule,
  ReglamentCalculatorDetailsLoader,
  ReglamentCalculatorDetailsModule,
} from './calculator-loader.types';

const CALCULATOR_SELECTOR = '[data-reglament-calculator]';
const CALCULATOR_CONTROL_SELECTOR =
  '[data-reglament-field],[data-reglament-reset]';
const EDITOR_DETAILS_SELECTOR = 'details[data-reglament-editor-row]';

const hydrationStates = new WeakMap<HTMLElement, number>();
const BASIC_HYDRATION = 1;
const DETAILS_HYDRATION = 3;

const loadControllerModule = (): Promise<ReglamentCalculatorControllerModule> =>
  import('./calculator-controller');
const loadDetailsModule = (): Promise<ReglamentCalculatorDetailsModule> =>
  import('./calculator-details');

export const bindReglamentCalculatorLazyHydration = (
  rootDocument: Document = document,
  loadController: ReglamentCalculatorControllerLoader = loadControllerModule,
  loadDetails: ReglamentCalculatorDetailsLoader = loadDetailsModule,
): (() => void) => {
  const hydrate = (root: HTMLElement, details: boolean): void => {
    const requestedState = details ? DETAILS_HYDRATION : BASIC_HYDRATION;
    const currentState = hydrationStates.get(root) ?? 0;

    if ((currentState & requestedState) === requestedState) {
      return;
    }

    hydrationStates.set(root, currentState | requestedState);
    const loadModule = details ? loadDetails : loadController;

    void loadModule().then(({ hydrateReglamentCalculator }) => {
      hydrateReglamentCalculator(root);
    });
  };

  const hydrateOpenDetails = (): void => {
    rootDocument
      .querySelectorAll(`${EDITOR_DETAILS_SELECTOR}[open]`)
      .forEach((details) => {
        const root = details.closest(CALCULATOR_SELECTOR);

        if (root instanceof HTMLElement) {
          hydrate(root, true);
        }
      });
  };
  const handleIntent = (event: Event): void => {
    if (!(event.target instanceof Element)) {
      return;
    }

    const details = event.target.closest(EDITOR_DETAILS_SELECTOR);
    const intent = details ?? event.target.closest(CALCULATOR_CONTROL_SELECTOR);
    const root = intent?.closest(CALCULATOR_SELECTOR);

    if (
      root instanceof HTMLElement &&
      (event.type !== 'toggle' ||
        (details instanceof HTMLDetailsElement && details.open))
    ) {
      hydrate(root, Boolean(details));
    }
  };
  rootDocument.addEventListener('focusin', handleIntent);
  rootDocument.addEventListener('pointerover', handleIntent);
  rootDocument.addEventListener('input', handleIntent);
  rootDocument.addEventListener('toggle', handleIntent, true);
  return hydrateOpenDetails;
};
