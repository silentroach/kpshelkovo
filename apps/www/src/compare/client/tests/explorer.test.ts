import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ExplorerPayload } from '../../lib/explorer';
import { startSettlementsExplorer } from '../explorer';
import type {
  ExplorerBootstrapDependencies,
  ExplorerBootstrapElements,
  ExplorerClientModule
} from '../explorer.types';

const payload = {
  settlements: [],
  comparisons: {},
  stats: {
    shelkovoTariff: 0,
    medianTariff: 0,
    peerMedianTariff: 0,
    meanTariff: 0,
    minTariff: 0,
    maxTariff: 0,
    shelkovoRank: 0,
    totalSettlements: 0,
    cheaperCount: 0,
    moreExpensiveCount: 0,
    shelkovoVsMedianPercent: 0,
    shelkovoVsPeerMedianPercent: 0,
    shelkovoVsMeanPercent: 0
  }
} satisfies ExplorerPayload;

const payloadUrl = '/static/settlements-explorer/payload-digest.json';

const renderBootstrap = (): ExplorerBootstrapElements => {
  document.body.innerHTML = `
    <div data-explorer-error hidden>
      <p data-explorer-error-message>Не удалось загрузить интерактивное сравнение</p>
      <button type="button" data-explorer-retry>Попробовать снова</button>
    </div>
    <div data-explorer-root data-explorer-payload-url="${payloadUrl}">
      <article data-server-card>SSR card</article>
    </div>
  `;
  const root = document.querySelector<HTMLElement>('[data-explorer-root]');
  const error = document.querySelector<HTMLElement>('[data-explorer-error]');
  const retry = document.querySelector<HTMLButtonElement>('[data-explorer-retry]');
  const message = document.querySelector<HTMLElement>('[data-explorer-error-message]');

  if (!root || !error || !message || !retry) throw new Error('Expected bootstrap fixture');

  return { root, error, message, retry, payloadUrl };
};

const createRuntime = (): {
  readonly client: ExplorerClientModule;
  readonly runtime: ExplorerBootstrapDependencies;
} => {
  const client: ExplorerClientModule = {
    hydrate: vi.fn(() => ({})),
    unmount: vi.fn()
  };

  return {
    client,
    runtime: {
      loadClient: vi.fn(async () => client),
      loadPayload: vi.fn(async () => payload)
    }
  };
};

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('settlements explorer bootstrap', () => {
  it('loads the component and payload in parallel and hydrates the SSR root once', async () => {
    const elements = renderBootstrap();
    const { client, runtime } = createRuntime();
    const stop = startSettlementsExplorer(elements, runtime);

    expect(runtime.loadClient).toHaveBeenCalledOnce();
    expect(runtime.loadPayload).toHaveBeenCalledOnce();
    expect(runtime.loadPayload).toHaveBeenCalledWith(payloadUrl);
    await vi.waitFor(() => expect(client.hydrate).toHaveBeenCalledOnce());

    expect(elements.root.querySelector('[data-server-card]')).toBeTruthy();
    expect(elements.root.hasAttribute('data-explorer-hydrated')).toBe(true);
    expect(elements.error.hidden).toBe(true);

    elements.retry.click();
    expect(runtime.loadPayload).toHaveBeenCalledOnce();

    stop();
    expect(client.unmount).toHaveBeenCalledOnce();
  });

  it('keeps SSR content and retries only data after a payload failure', async () => {
    const elements = renderBootstrap();
    const { client, runtime } = createRuntime();
    vi.mocked(runtime.loadPayload).mockRejectedValueOnce(new Error('Network error'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    startSettlementsExplorer(elements, runtime);

    await vi.waitFor(() => expect(elements.error.hidden).toBe(false));
    expect(elements.root.textContent).toContain('SSR card');
    expect(client.hydrate).not.toHaveBeenCalled();

    elements.retry.click();
    await vi.waitFor(() => expect(client.hydrate).toHaveBeenCalledOnce());

    expect(runtime.loadClient).toHaveBeenCalledOnce();
    expect(runtime.loadPayload).toHaveBeenCalledTimes(2);
    expect(elements.error.hidden).toBe(true);
  });

  it.each(['component', 'hydration'] as const)(
    'does not retry after a %s failure',
    async (failure) => {
      const elements = renderBootstrap();
      const { client, runtime } = createRuntime();
      vi.spyOn(console, 'error').mockImplementation(() => {});
      if (failure === 'component') vi.mocked(runtime.loadClient).mockRejectedValue(new Error('JS'));
      else
        vi.mocked(client.hydrate).mockImplementation(() => {
          throw new Error('hydrate');
        });
      startSettlementsExplorer(elements, runtime);
      await vi.waitFor(() => expect(elements.error.hidden).toBe(false));
      expect(elements.message.textContent).toContain('обновить страницу');
      expect(elements.retry.hidden).toBe(true);
      elements.retry.dispatchEvent(new Event('click'));
      expect(runtime.loadClient).toHaveBeenCalledOnce();
      expect(runtime.loadPayload).toHaveBeenCalledOnce();
      expect(elements.root.textContent).toContain('SSR card');
    }
  );

  it.each(['component', 'payload'] as const)(
    'prioritizes code failure when %s fails first',
    async (first) => {
      const elements = renderBootstrap();
      const { client, runtime } = createRuntime();
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const code = Promise.withResolvers<ExplorerClientModule>();
      const data = Promise.withResolvers<ExplorerPayload>();
      vi.mocked(runtime.loadClient).mockReturnValue(code.promise);
      vi.mocked(runtime.loadPayload).mockReturnValue(data.promise);
      startSettlementsExplorer(elements, runtime);
      (first === 'component' ? code : data).reject(new Error(first));
      await Promise.resolve();
      (first === 'component' ? data : code).reject(new Error('second'));
      await vi.waitFor(() => expect(elements.error.hidden).toBe(false));
      expect(elements.message.textContent).toContain('обновить страницу');
      expect(elements.retry.hidden).toBe(true);
      expect(client.hydrate).not.toHaveBeenCalled();
    }
  );

  it.each(['resolve', 'reject', 'detached'] as const)(
    'ignores %s completion after disposal or detachment',
    async (completion) => {
      const elements = renderBootstrap();
      const { client, runtime } = createRuntime();
      const data = Promise.withResolvers<ExplorerPayload>();
      vi.mocked(runtime.loadPayload).mockReturnValue(data.promise);
      const stop = startSettlementsExplorer(elements, runtime);
      if (completion === 'detached') elements.root.remove();
      else stop();
      if (completion === 'reject') data.reject(new Error('offline'));
      else data.resolve(payload);
      await Promise.allSettled([data.promise]);
      await Promise.resolve();
      elements.retry.click();
      expect(client.hydrate).not.toHaveBeenCalled();
      expect(elements.error.hidden).toBe(true);
      expect(runtime.loadPayload).toHaveBeenCalledOnce();
    }
  );
});
