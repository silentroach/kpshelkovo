import { describe, expect, it, vi } from 'vitest';

const openSearchDialog = vi.hoisted(() => vi.fn());

vi.mock('@/components/search/lazy?search-load=initial', () => {
  throw new Error('chunk unavailable');
});
vi.mock('@/components/search/lazy?search-load=retry', () => ({
  openSearchDialog,
}));

import { loadSearchDialog } from '../search-dialog-loader';

describe('search dialog loader', () => {
  it('uses a fresh module URL after a failed import', async () => {
    await expect(loadSearchDialog()).rejects.toThrow();
    await expect(loadSearchDialog()).resolves.toEqual({ openSearchDialog });
  });
});
