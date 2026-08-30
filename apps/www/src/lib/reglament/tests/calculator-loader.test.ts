// @vitest-environment happy-dom

import { describe, expect, it, vi } from 'vitest';

import { bindReglamentCalculatorLazyHydration } from '../calculator-loader';
import type {
  ReglamentCalculatorControllerLoader,
  ReglamentCalculatorControllerModule,
  ReglamentCalculatorEditorLoader,
  ReglamentCalculatorEditorModule,
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
  const editorModule = {
    hydrateReglamentEditors: vi.fn(),
  } satisfies ReglamentCalculatorEditorModule;

  return { controllerModule, editorModule, runtime };
};

describe('bindReglamentCalculatorLazyHydration', () => {
  it('starts controller and editor imports together on direct details opening', () => {
    const rootDocument = document.implementation.createHTMLDocument();
    renderCalculator(rootDocument);
    const loadController = vi.fn(
      () => new Promise<ReglamentCalculatorControllerModule>(() => undefined),
    );
    const loadEditor = vi.fn(
      () => new Promise<ReglamentCalculatorEditorModule>(() => undefined),
    );

    bindReglamentCalculatorLazyHydration(
      rootDocument,
      loadController,
      loadEditor,
    );

    const details = getCalculatorNode(
      rootDocument,
      'details',
      HTMLDetailsElement,
    );
    details.open = true;
    details.dispatchEvent(new Event('toggle'));

    expect({
      controllerImports: loadController.mock.calls.length,
      editorImports: loadEditor.mock.calls.length,
    }).toMatchInlineSnapshot(`
      {
        "controllerImports": 1,
        "editorImports": 1,
      }
    `);
  });

  it('loads only the controller for basic fields and connects the editor later', async () => {
    const rootDocument = document.implementation.createHTMLDocument();
    renderCalculator(rootDocument);
    const { controllerModule, editorModule, runtime } = createModules();
    const loadController: ReglamentCalculatorControllerLoader = vi.fn(
      async () => controllerModule,
    );
    const loadEditor: ReglamentCalculatorEditorLoader = vi.fn(
      async () => editorModule,
    );

    bindReglamentCalculatorLazyHydration(
      rootDocument,
      loadController,
      loadEditor,
    );

    getCalculatorNode(rootDocument, 'input', HTMLInputElement).dispatchEvent(
      new Event('pointerover', { bubbles: true }),
    );

    await vi.waitFor(() => {
      expect(controllerModule.hydrateReglamentCalculator).toHaveBeenCalledTimes(
        1,
      );
    });
    expect(loadEditor).not.toHaveBeenCalled();

    const root = getCalculatorNode(
      rootDocument,
      '[data-reglament-calculator]',
      HTMLElement,
    );
    const details = getCalculatorNode(
      rootDocument,
      'details',
      HTMLDetailsElement,
    );
    details.open = true;
    details.dispatchEvent(new Event('toggle'));

    await vi.waitFor(() => {
      expect(editorModule.hydrateReglamentEditors).toHaveBeenCalledWith(
        root,
        runtime.registerEditor,
      );
    });
    expect({
      controllerImports: vi.mocked(loadController).mock.calls.length,
      controllerHydrations:
        controllerModule.hydrateReglamentCalculator.mock.calls.length,
      editorImports: vi.mocked(loadEditor).mock.calls.length,
      editorHydrations: editorModule.hydrateReglamentEditors.mock.calls.length,
    }).toMatchInlineSnapshot(`
      {
        "controllerHydrations": 1,
        "controllerImports": 1,
        "editorHydrations": 1,
        "editorImports": 1,
      }
    `);
  });

  it('prepares each Astro replacement once across both lifecycle events', async () => {
    const rootDocument = document.implementation.createHTMLDocument();
    renderCalculator(rootDocument);
    const { controllerModule, editorModule } = createModules();
    const loadController: ReglamentCalculatorControllerLoader = vi.fn(
      async () => controllerModule,
    );
    const loadEditor: ReglamentCalculatorEditorLoader = vi.fn(
      async () => editorModule,
    );

    bindReglamentCalculatorLazyHydration(
      rootDocument,
      loadController,
      loadEditor,
    );
    bindReglamentCalculatorLazyHydration(
      rootDocument,
      loadController,
      loadEditor,
    );
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
      expect(editorModule.hydrateReglamentEditors).toHaveBeenCalledTimes(1);
    });
    expect({
      controllerImports: vi.mocked(loadController).mock.calls.length,
      controllerHydrations:
        controllerModule.hydrateReglamentCalculator.mock.calls.length,
      editorImports: vi.mocked(loadEditor).mock.calls.length,
      editorHydrations: editorModule.hydrateReglamentEditors.mock.calls.length,
    }).toMatchInlineSnapshot(`
      {
        "controllerHydrations": 2,
        "controllerImports": 1,
        "editorHydrations": 1,
        "editorImports": 1,
      }
    `);
  });
});
