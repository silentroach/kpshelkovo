// @vitest-environment happy-dom

import { describe, expect, it, vi } from 'vitest';

import { bindReglamentCalculatorLazyHydration } from '../calculator-loader';
import type {
  ReglamentCalculatorControllerLoader,
  ReglamentCalculatorControllerModule,
  ReglamentCalculatorDetailsLoader,
  ReglamentCalculatorDetailsModule,
} from '../calculator-loader.types';

const renderCalculator = (
  rootDocument: Document,
  detailsOpen = false,
): void => {
  rootDocument.body.innerHTML = `
    <div data-reglament-calculator>
      <input data-reglament-field="volume" />
      <details data-reglament-editor-row="lighting" ${detailsOpen ? 'open' : ''}>
        <summary>Детали</summary>
      </details>
    </div>
  `;
};

const getCalculatorNode = <NodeType extends Element>(
  rootDocument: Document,
  selector: string,
  NodeConstructor: { new (): NodeType },
): NodeType => {
  const node = rootDocument.querySelector(selector);

  if (!(node instanceof NodeConstructor)) {
    throw new Error(`Missing calculator fixture node: ${selector}`);
  }

  return node;
};

const createModules = () => {
  const runtime = {
    registerEditor: vi.fn(),
    render: vi.fn(),
  };
  const controllerModule = {
    hydrateReglamentCalculator: vi.fn(() => runtime),
  } satisfies ReglamentCalculatorControllerModule;
  const detailsModule = {
    hydrateReglamentCalculator: vi.fn(),
  } satisfies ReglamentCalculatorDetailsModule;

  return { controllerModule, detailsModule };
};

describe('bindReglamentCalculatorLazyHydration', () => {
  it('starts the details entry without waiting for the controller loader', () => {
    const rootDocument = document.implementation.createHTMLDocument();
    renderCalculator(rootDocument);
    const loadController = vi.fn(
      () => new Promise<ReglamentCalculatorControllerModule>(() => undefined),
    );
    const loadDetails = vi.fn(
      () => new Promise<ReglamentCalculatorDetailsModule>(() => undefined),
    );

    bindReglamentCalculatorLazyHydration(
      rootDocument,
      loadController,
      loadDetails,
    );

    const details = getCalculatorNode(
      rootDocument,
      'details',
      HTMLDetailsElement,
    );
    details.dispatchEvent(new Event('toggle'));

    expect(loadDetails).not.toHaveBeenCalled();

    details.open = true;
    details.dispatchEvent(new Event('toggle'));

    expect({
      controllerImports: loadController.mock.calls.length,
      detailsImports: loadDetails.mock.calls.length,
    }).toMatchInlineSnapshot(`
      {
        "controllerImports": 0,
        "detailsImports": 1,
      }
    `);
  });

  it('loads only the controller for basic fields and connects the editor later', async () => {
    const rootDocument = document.implementation.createHTMLDocument();
    renderCalculator(rootDocument);
    const { controllerModule, detailsModule } = createModules();
    const loadController: ReglamentCalculatorControllerLoader = vi.fn(
      async () => controllerModule,
    );
    const loadDetails: ReglamentCalculatorDetailsLoader = vi.fn(
      async () => detailsModule,
    );

    bindReglamentCalculatorLazyHydration(
      rootDocument,
      loadController,
      loadDetails,
    );

    getCalculatorNode(rootDocument, 'input', HTMLInputElement).dispatchEvent(
      new Event('pointerover', { bubbles: true }),
    );

    await vi.waitFor(() => {
      expect(controllerModule.hydrateReglamentCalculator).toHaveBeenCalledTimes(
        1,
      );
    });
    expect(loadDetails).not.toHaveBeenCalled();

    const details = getCalculatorNode(
      rootDocument,
      'details',
      HTMLDetailsElement,
    );
    details.open = true;
    details.dispatchEvent(new Event('toggle'));

    await vi.waitFor(() => {
      expect(detailsModule.hydrateReglamentCalculator).toHaveBeenCalledWith(
        getCalculatorNode(
          rootDocument,
          '[data-reglament-calculator]',
          HTMLElement,
        ),
      );
    });
    expect({
      controllerImports: vi.mocked(loadController).mock.calls.length,
      controllerHydrations:
        controllerModule.hydrateReglamentCalculator.mock.calls.length,
      detailsImports: vi.mocked(loadDetails).mock.calls.length,
      detailsHydrations:
        detailsModule.hydrateReglamentCalculator.mock.calls.length,
    }).toMatchInlineSnapshot(`
      {
        "controllerHydrations": 1,
        "controllerImports": 1,
        "detailsHydrations": 1,
        "detailsImports": 1,
      }
    `);
  });

  it('prepares each Astro replacement once across both lifecycle events', async () => {
    const rootDocument = document.implementation.createHTMLDocument();
    renderCalculator(rootDocument);
    const { controllerModule, detailsModule } = createModules();
    const loadController: ReglamentCalculatorControllerLoader = vi.fn(
      async () => controllerModule,
    );
    const loadDetails: ReglamentCalculatorDetailsLoader = vi.fn(
      async () => detailsModule,
    );

    const hydrate = bindReglamentCalculatorLazyHydration(
      rootDocument,
      loadController,
      loadDetails,
    );
    rootDocument.addEventListener('astro:after-swap', hydrate);
    rootDocument.addEventListener('astro:page-load', hydrate);

    rootDocument.dispatchEvent(new Event('astro:after-swap'));
    rootDocument.dispatchEvent(new Event('astro:page-load'));

    const input = getCalculatorNode(rootDocument, 'input', HTMLInputElement);
    input.dispatchEvent(new Event('focusin', { bubbles: true }));
    input.dispatchEvent(new Event('pointerover', { bubbles: true }));

    await vi.waitFor(() => {
      expect(controllerModule.hydrateReglamentCalculator).toHaveBeenCalledTimes(
        1,
      );
    });

    renderCalculator(rootDocument, true);
    rootDocument.dispatchEvent(new Event('astro:after-swap'));
    rootDocument.dispatchEvent(new Event('astro:page-load'));
    rootDocument.dispatchEvent(new Event('astro:page-load'));

    await vi.waitFor(() => {
      expect(detailsModule.hydrateReglamentCalculator).toHaveBeenCalledTimes(1);
    });
    expect({
      controllerImports: vi.mocked(loadController).mock.calls.length,
      controllerHydrations:
        controllerModule.hydrateReglamentCalculator.mock.calls.length,
      detailsImports: vi.mocked(loadDetails).mock.calls.length,
      detailsHydrations:
        detailsModule.hydrateReglamentCalculator.mock.calls.length,
    }).toMatchInlineSnapshot(`
      {
        "controllerHydrations": 1,
        "controllerImports": 1,
        "detailsHydrations": 1,
        "detailsImports": 1,
      }
    `);
  });
});
