import type { ExplorerPayload } from '../lib/explorer';

export type ExplorerInstance = Record<string, unknown>;

export interface ExplorerClientModule {
  readonly hydrate: (
    target: HTMLElement,
    payload: ExplorerPayload,
  ) => ExplorerInstance;
  readonly unmount: (instance: ExplorerInstance) => void;
}

export interface ExplorerBootstrapElements {
  readonly root: HTMLElement;
  readonly error: HTMLElement;
  readonly retry: HTMLButtonElement;
}

export interface ExplorerBootstrapDependencies {
  readonly loadClient: () => Promise<ExplorerClientModule>;
  readonly loadPayload: () => Promise<ExplorerPayload>;
}
