import type {
  ReglamentCalculatorControllerLoader,
  ReglamentCalculatorControllerModule,
  ReglamentCalculatorEditorLoader,
  ReglamentCalculatorEditorModule,
} from './calculator-loader.types';

const CALCULATOR_SELECTOR = '[data-reglament-calculator]';
const CALCULATOR_CONTROL_SELECTOR =
  '[data-reglament-field],[data-reglament-reset]';
const EDITOR_DETAILS_SELECTOR = 'details[data-reglament-editor-row]';

const boundDocuments = new WeakSet<Document>();

const loadControllerModule = (): Promise<ReglamentCalculatorControllerModule> =>
  import('./calculator-controller');
const loadEditorModule = (): Promise<ReglamentCalculatorEditorModule> =>
  import('./calculator-editor');

export const bindReglamentCalculatorLazyHydration = (
  rootDocument: Document = document,
  loadController: ReglamentCalculatorControllerLoader = loadControllerModule,
  loadEditor: ReglamentCalculatorEditorLoader = loadEditorModule,
): void => {
  if (boundDocuments.has(rootDocument)) {
    return;
  }

  boundDocuments.add(rootDocument);

  const preparedRoots = new WeakSet<HTMLElement>();
  let controllerModulePromise:
    Promise<ReglamentCalculatorControllerModule> | undefined;
  let editorModulePromise: Promise<ReglamentCalculatorEditorModule> | undefined;

  const prepare = (root: HTMLElement): void => {
    if (preparedRoots.has(root)) {
      return;
    }

    preparedRoots.add(root);

    let controllerHydration:
      | Promise<
          ReturnType<
            ReglamentCalculatorControllerModule['hydrateReglamentCalculator']
          >
        >
      | undefined;
    let editorHydration: Promise<void> | undefined;

    const removeIntentListeners = (): void => {
      root.removeEventListener('focusin', handleIntent);
      root.removeEventListener('pointerover', handleIntent);
      root.removeEventListener('input', loadCalculator);
      root.removeEventListener('toggle', handleToggle, true);
    };
    const loadCalculator = () => {
      controllerModulePromise ??= loadController();
      controllerHydration ??= controllerModulePromise.then(
        ({ hydrateReglamentCalculator }) => {
          const runtime = hydrateReglamentCalculator(root);
          root.removeEventListener('input', loadCalculator);

          return runtime;
        },
      );

      return controllerHydration;
    };
    const loadEditors = (): void => {
      if (editorHydration) {
        return;
      }

      editorModulePromise ??= loadEditor();
      const calculator = loadCalculator();

      editorHydration = Promise.all([calculator, editorModulePromise]).then(
        ([runtime, { hydrateReglamentEditors }]) => {
          hydrateReglamentEditors(root, runtime.registerEditor);
          removeIntentListeners();
        },
      );
    };
    function handleIntent(event: Event): void {
      if (!(event.target instanceof Element)) {
        return;
      }

      if (event.target.closest(EDITOR_DETAILS_SELECTOR)) {
        loadEditors();
      } else if (event.target.closest(CALCULATOR_CONTROL_SELECTOR)) {
        void loadCalculator();
      }
    }
    function handleToggle(event: Event): void {
      if (
        event.target instanceof HTMLDetailsElement &&
        event.target.matches(EDITOR_DETAILS_SELECTOR) &&
        event.target.open
      ) {
        loadEditors();
      }
    }

    root.addEventListener('focusin', handleIntent);
    root.addEventListener('pointerover', handleIntent);
    root.addEventListener('input', loadCalculator);
    root.addEventListener('toggle', handleToggle, true);

    if (root.querySelector(`${EDITOR_DETAILS_SELECTOR}[open]`)) {
      loadEditors();
    }
  };

  const hydrate = (): void => {
    rootDocument.querySelectorAll(CALCULATOR_SELECTOR).forEach((root) => {
      if (root instanceof HTMLElement) {
        prepare(root);
      }
    });
  };

  hydrate();
  rootDocument.addEventListener('astro:after-swap', hydrate);
  rootDocument.addEventListener('astro:page-load', hydrate);
};
