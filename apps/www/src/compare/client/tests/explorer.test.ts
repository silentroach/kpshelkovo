import { afterEach, describe, expect, it, vi } from 'vitest';

import { startSettlementsExplorer } from '../explorer';
import type {
  ExplorerBootstrapDependencies,
  ExplorerBootstrapElements,
  ExplorerClientModule,
} from '../explorer.types';
import type { ExplorerPayload } from '../../lib/explorer';

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
    shelkovoVsMeanPercent: 0,
  },
} satisfies ExplorerPayload;

const payloadUrl = '/static/settlements-explorer/payload-digest.json';

const renderBootstrap = (): ExplorerBootstrapElements => {
  document.body.innerHTML = `
    <div data-explorer-error hidden>
      <p>Не удалось загрузить интерактивное сравнение</p>
      <button type="button" data-explorer-retry>Попробовать снова</button>
    </div>
    <div data-explorer-root data-explorer-payload-url="${payloadUrl}">
      <article data-server-card>SSR card</article>
    </div>
  `;
  const root = document.querySelector<HTMLElement>('[data-explorer-root]');
  const error = document.querySelector<HTMLElement>('[data-explorer-error]');
  const retry = document.querySelector<HTMLButtonElement>(
    '[data-explorer-retry]',
  );

  if (!root || !error || !retry) throw new Error('Expected bootstrap fixture');

  return { root, error, retry, payloadUrl };
};

const createRuntime = (): {
  readonly client: ExplorerClientModule;
  readonly runtime: ExplorerBootstrapDependencies;
} => {
  const client: ExplorerClientModule = {
    hydrate: vi.fn(() => ({})),
    unmount: vi.fn(),
  };

  return {
    client,
    runtime: {
      loadClient: vi.fn(async () => client),
      loadPayload: vi.fn(async () => payload),
    },
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

  it.each(['component', 'payload'] as const)(
    'keeps SSR content and retries after a %s load failure',
    async (failure) => {
      const elements = renderBootstrap();
      const { client, runtime } = createRuntime();
      const failedLoader =
        failure === 'component' ? runtime.loadClient : runtime.loadPayload;
      vi.mocked(failedLoader).mockRejectedValueOnce(new Error('Network error'));
      vi.spyOn(console, 'error').mockImplementation(() => {});

      startSettlementsExplorer(elements, runtime);

      await vi.waitFor(() => expect(elements.error.hidden).toBe(false));
      expect(elements.root.textContent).toContain('SSR card');
      expect(client.hydrate).not.toHaveBeenCalled();

      elements.retry.click();
      await vi.waitFor(() => expect(client.hydrate).toHaveBeenCalledOnce());

      expect(runtime.loadClient).toHaveBeenCalledTimes(2);
      expect(runtime.loadPayload).toHaveBeenCalledTimes(2);
      expect(elements.error.hidden).toBe(true);
    },
  );
});
