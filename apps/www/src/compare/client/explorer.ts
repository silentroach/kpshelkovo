import { explorerGraphUrl } from 'virtual:settlements-explorer-assets';

import type { ExplorerPayload } from '../lib/explorer';
import { withBase } from '../lib/url';
import type {
  ExplorerBootstrapDependencies,
  ExplorerBootstrapElements,
  ExplorerClientModule,
  ExplorerInstance,
} from './explorer.types';

const ROOT_SELECTOR = '[data-explorer-root]';
const ERROR_SELECTOR = '[data-explorer-error]';
const RETRY_SELECTOR = '[data-explorer-retry]';
let graphRequest: Promise<ExplorerClientModule> | undefined;
let graphRetry = 0;

const loadClient = (): Promise<ExplorerClientModule> => {
  if (graphRequest) return graphRequest;

  const graphUrl = new URL(explorerGraphUrl, window.location.origin);
  if (graphRetry > 0) {
    graphUrl.searchParams.set('explorer-retry', String(graphRetry));
  }

  graphRequest = (
    import(/* @vite-ignore */ graphUrl.href) as Promise<ExplorerClientModule>
  ).catch((error) => {
    graphRequest = undefined;
    graphRetry += 1;
    throw error;
  });

  return graphRequest;
};

const loadPayload = async (): Promise<ExplorerPayload> => {
  const response = await fetch(withBase('/data/explorer.json'));

  if (!response.ok) {
    throw new Error(`Explorer data request failed: ${response.status}`);
  }

  return response.json() as Promise<ExplorerPayload>;
};

const dependencies: ExplorerBootstrapDependencies = {
  loadClient,
  loadPayload,
};

export const startSettlementsExplorer = (
  { root, error, retry }: ExplorerBootstrapElements,
  runtime: ExplorerBootstrapDependencies = dependencies,
): (() => void) => {
  let state: 'idle' | 'loading' | 'error' | 'hydrated' = 'idle';
  let disposed = false;
  let client: ExplorerClientModule | undefined;
  let instance: ExplorerInstance | undefined;

  const load = async (): Promise<void> => {
    if (state === 'loading' || state === 'hydrated' || disposed) return;

    state = 'loading';
    error.hidden = true;

    try {
      const [loadedClient, payload] = await Promise.all([
        runtime.loadClient(),
        runtime.loadPayload(),
      ]);

      if (disposed || !root.isConnected) return;

      client = loadedClient;
      instance = client.hydrate(root, payload);
      state = 'hydrated';
      root.setAttribute('data-explorer-hydrated', '');
    } catch (loadError) {
      if (disposed) return;

      console.error('Settlements explorer hydration failed:', loadError);
      state = 'error';
      error.hidden = false;
    }
  };

  const retryLoad = (): void => {
    if (state === 'error') void load();
  };

  retry.addEventListener('click', retryLoad);
  void load();

  return () => {
    disposed = true;
    retry.removeEventListener('click', retryLoad);
    if (instance) client?.unmount(instance);
  };
};

const getElements = (): ExplorerBootstrapElements | undefined => {
  const root = document.querySelector<HTMLElement>(ROOT_SELECTOR);
  const error = document.querySelector<HTMLElement>(ERROR_SELECTOR);
  const retry = document.querySelector<HTMLButtonElement>(RETRY_SELECTOR);

  if (!root || !error || !retry) return;

  return { root, error, retry };
};

export const installSettlementsExplorer = (): void => {
  let activeRoot: HTMLElement | undefined;
  let stop: (() => void) | undefined;

  const connect = (): void => {
    const elements = getElements();
    if (!elements || elements.root === activeRoot) return;

    stop?.();
    activeRoot = elements.root;
    stop = startSettlementsExplorer(elements);
  };

  const disconnect = (): void => {
    stop?.();
    stop = undefined;
    activeRoot = undefined;
  };

  connect();
  document.addEventListener('astro:page-load', connect);
  document.addEventListener('astro:before-swap', disconnect);
};
