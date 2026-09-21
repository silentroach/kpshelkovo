import type { ExplorerPayload } from '../lib/explorer';
import type {
  ExplorerBootstrapDependencies,
  ExplorerBootstrapElements,
  ExplorerClientModule,
  ExplorerInstance
} from './explorer.types';

const ROOT_SELECTOR = '[data-explorer-root]';
const ERROR_SELECTOR = '[data-explorer-error]';
const RETRY_SELECTOR = '[data-explorer-retry]';
const loadClient = (): Promise<ExplorerClientModule> => import('./explorer-component');

const loadPayload = async (url: string): Promise<ExplorerPayload> => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Explorer data request failed: ${response.status}`);
  }

  return response.json() as Promise<ExplorerPayload>;
};

const dependencies: ExplorerBootstrapDependencies = {
  loadClient,
  loadPayload
};

export const startSettlementsExplorer = (
  { root, error, message, retry, payloadUrl }: ExplorerBootstrapElements,
  runtime: ExplorerBootstrapDependencies = dependencies
): (() => void) => {
  let state: 'idle' | 'loading' | 'data-error' | 'code-error' | 'hydrated' = 'idle';
  let disposed = false;
  let client: ExplorerClientModule | undefined;
  let instance: ExplorerInstance | undefined;

  const showError = (cause: unknown, codeFailed: boolean): void => {
    console.error('Settlements explorer hydration failed:', cause);
    state = codeFailed ? 'code-error' : 'data-error';
    message.textContent = codeFailed
      ? 'Фильтры и сортировка недоступны. Попробуйте обновить страницу'
      : 'Не удалось загрузить интерактивное сравнение';
    retry.hidden = codeFailed;
    retry.disabled = codeFailed;
    error.hidden = false;
  };

  const load = async (): Promise<void> => {
    if ((state !== 'idle' && state !== 'data-error') || disposed) return;

    state = 'loading';
    error.hidden = true;

    const [loadedClient, payload] = await Promise.allSettled([
      client ??
        runtime.loadClient().catch((cause: unknown) => {
          if (!disposed && root.isConnected) showError(cause, true);
          throw cause;
        }),
      runtime.loadPayload(payloadUrl)
    ]);
    if (disposed || !root.isConnected) return;

    if (loadedClient.status === 'rejected') return;
    client = loadedClient.value;
    if (payload.status === 'rejected') {
      showError(payload.reason, false);
      return;
    }

    try {
      instance = client.hydrate(root, payload.value);
      state = 'hydrated';
      root.setAttribute('data-explorer-hydrated', '');
    } catch (loadError) {
      showError(loadError, true);
    }
  };

  const retryLoad = (): void => {
    if (state === 'data-error') void load();
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
  const message = error?.querySelector<HTMLElement>('[data-explorer-error-message]');
  const payloadUrl = root?.dataset.explorerPayloadUrl;

  if (!root || !error || !message || !retry || !payloadUrl) return;

  return { root, error, message, retry, payloadUrl };
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
