import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const openSearchDialog = vi.hoisted(() => vi.fn());

vi.mock('virtual:search-dialog-assets', () => ({
  searchDialogGraphUrl: '/SearchDialog.js',
}));

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal('location', { origin: 'http://localhost:3000' });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('search dialog loader', () => {
  it('uses the independent graph URL after a failed import', async () => {
    const importGraph = vi
      .fn()
      .mockRejectedValueOnce(new Error('chunk unavailable'))
      .mockResolvedValueOnce({ openSearchDialog });
    const { isSearchDialogLoadRetry, loadSearchDialog } =
      await import('../search-dialog-loader');

    await expect(loadSearchDialog(importGraph)).rejects.toThrow();
    await expect(loadSearchDialog(importGraph)).resolves.toEqual({
      openSearchDialog,
    });
    expect({
      calls: importGraph.mock.calls,
      retry: isSearchDialogLoadRetry(),
    }).toMatchInlineSnapshot(`
      {
        "calls": [
          [
            "http://localhost:3000/SearchDialog.js",
          ],
          [
            "http://localhost:3000/SearchDialog.js?search-retry=1",
          ],
        ],
        "retry": true,
      }
    `);
  });

  it('uses another fresh URL after repeated failures', async () => {
    const importGraph = vi
      .fn()
      .mockRejectedValueOnce(new Error('chunk unavailable'))
      .mockRejectedValueOnce(new Error('chunk unavailable'))
      .mockResolvedValueOnce({ openSearchDialog });
    const { loadSearchDialog } = await import('../search-dialog-loader');

    await expect(loadSearchDialog(importGraph)).rejects.toThrow();
    await expect(loadSearchDialog(importGraph)).rejects.toThrow();
    await expect(loadSearchDialog(importGraph)).resolves.toEqual({
      openSearchDialog,
    });
    expect(importGraph.mock.calls).toMatchInlineSnapshot(`
      [
        [
          "http://localhost:3000/SearchDialog.js",
        ],
        [
          "http://localhost:3000/SearchDialog.js?search-retry=1",
        ],
        [
          "http://localhost:3000/SearchDialog.js?search-retry=2",
        ],
      ]
    `);
  });
});
