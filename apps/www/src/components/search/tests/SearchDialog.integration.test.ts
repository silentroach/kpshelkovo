import { resolve } from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';

import type { SearchResponse } from '@/lib/search/client.types';

const search = vi.hoisted(() =>
  vi.fn(async (query: string): Promise<SearchResponse> => ({
    state: 'ready',
    query,
    searchQuery: query,
    results: [],
    total: 0,
  })),
);

vi.mock('@/lib/search/client', () => ({
  pagefindSearchClient: {
    init: vi.fn(async () => {}),
    preload: vi.fn(async () => {}),
    search,
  },
}));

const renderSearchDialog = async (): Promise<string> => {
  vi.stubGlobal('localStorage', {
    clear: vi.fn(),
    getItem: vi.fn(),
    key: vi.fn(),
    length: 0,
    removeItem: vi.fn(),
    setItem: vi.fn(),
  });
  const [{ svelte }, { createServer }] = await Promise.all([
    import('@sveltejs/vite-plugin-svelte'),
    import('vite'),
  ]);
  const server = await createServer({
    appType: 'custom',
    cacheDir: resolve(
      process.cwd(),
      'node_modules/.vite/search-dialog-ssr-test',
    ),
    configFile: false,
    plugins: [svelte()],
    resolve: {
      alias: {
        '@': resolve(process.cwd(), 'src'),
      },
    },
    root: process.cwd(),
    server: { middlewareMode: true },
  });

  try {
    const module = await server.ssrLoadModule(
      '/src/components/search/tests/SearchDialog.ssr-fixture.ts',
    );

    return module.renderSearchDialog();
  } finally {
    await server.close();
  }
};

afterEach(() => {
  document.dispatchEvent(new Event('astro:before-swap'));
  document.body.innerHTML = '';
  search.mockClear();
  vi.unstubAllGlobals();
});

it('hydrates the focused server input without losing its first query', async () => {
  document.body.innerHTML = `
    <button type="button">Search</button>
    <div data-search-dialog-root>${await renderSearchDialog()}</div>
  `;
  const opener = document.querySelector<HTMLElement>('button');
  const root = document.querySelector<HTMLElement>('[data-search-dialog-root]');
  const dialog = root?.querySelector<HTMLDialogElement>('[data-search-dialog]');
  const input = root?.querySelector<HTMLInputElement>('[data-search-input]');
  if (!opener || !root || !dialog || !input) {
    throw new Error('Expected server-rendered search dialog');
  }

  dialog.showModal();
  input.focus();
  input.value = 'вода';

  const { openSearchDialog } = await import('../lazy');
  openSearchDialog(root, opener, input.value);

  expect(root.querySelector('[data-search-input]')).toBe(input);
  expect(document.activeElement).toBe(input);
  await vi.waitFor(() => expect(search).toHaveBeenCalledWith('вода', 8));

  input.dispatchEvent(
    new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }),
  );
  expect(dialog.open).toBe(false);
  expect(document.activeElement).toBe(opener);
});
