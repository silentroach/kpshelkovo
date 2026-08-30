import { hydrateReglamentCalculator as hydrateController } from './calculator-controller';
import { hydrateReglamentEditors } from './calculator-editor';

export const hydrateReglamentCalculator = (root: HTMLElement): void => {
  const runtime = hydrateController(root);

  hydrateReglamentEditors(root, runtime.registerEditor);
};
