import type { APIContext } from 'astro';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  GET as offerGet,
  getStaticPaths as offerPaths
} from '@/pages/ukogo/[group]/[kind]/[offer]/index.md';
import { GET as kindGet, getStaticPaths as kindPaths } from '@/pages/ukogo/[group]/[kind]/index.md';
import { GET as groupGet, getStaticPaths as groupPaths } from '@/pages/ukogo/[group]/index.md';
import { GET as homeGet } from '@/pages/ukogo/index.md';

import { buildInventoryDataset, loadInventoryData } from '../load';
import { kindEntry, offerEntry, ownerEntry, parcels } from './fixtures';

vi.mock('../load', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../load')>();
  return { ...actual, loadInventoryData: vi.fn() };
});

afterEach(() => vi.clearAllMocks());

const context = (params: Record<string, string> = {}): APIContext => ({ params }) as APIContext;

describe('inventory Markdown endpoints', () => {
  it('prerenders empty groups and all declared kinds, including an empty kind', async () => {
    vi.mocked(loadInventoryData).mockResolvedValue(
      buildInventoryDataset({ owners: [], kinds: [kindEntry()], offers: [] }, { parcels })
    );

    expect(await groupPaths()).toMatchInlineSnapshot(`
      [
        {
          "params": {
            "group": "construction",
          },
        },
        {
          "params": {
            "group": "garden",
          },
        },
        {
          "params": {
            "group": "home",
          },
        },
      ]
    `);
    expect(await kindPaths()).toMatchInlineSnapshot(`
      [
        {
          "params": {
            "group": "construction",
            "kind": "grinder",
          },
        },
      ]
    `);
    expect(await offerPaths()).toEqual([]);
    for (const response of await Promise.all([
      homeGet(context()),
      groupGet(context({ group: 'garden' })),
      kindGet(context({ group: 'construction', kind: 'grinder' }))
    ])) {
      expect(response.headers.get('content-type')).toBe('text/markdown; charset=utf-8');
      expect(response.headers.get('x-robots-tag')).toBe('noindex, follow');
      expect(await response.text()).toContain('Пока нет предложений.');
    }
  });

  it('generates only active offers and returns their full Markdown rather than the listing', async () => {
    const data = buildInventoryDataset(
      {
        owners: [ownerEntry()],
        kinds: [kindEntry(), kindEntry('empty', { group: 'garden' })],
        offers: [offerEntry('first', undefined, 'Полное описание инструмента.')]
      },
      { parcels }
    );
    vi.mocked(loadInventoryData).mockResolvedValue(data);
    expect(await offerPaths()).toMatchInlineSnapshot(`
      [
        {
          "params": {
            "group": "construction",
            "kind": "grinder",
            "offer": "first",
          },
        },
      ]
    `);
    const params = { group: 'construction', kind: 'grinder', offer: 'first' };
    const response = await offerGet(context(params));
    expect(response.headers.get('content-type')).toBe('text/markdown; charset=utf-8');
    expect(response.headers.get('x-robots-tag')).toBe('noindex, follow');
    expect(await response.text()).toContain('Полное описание инструмента.');
    const listing = await kindGet(context(params));
    expect(await listing.text()).not.toContain('Полное описание инструмента.');

    for (const invalid of [
      { group: 'garden', kind: 'grinder', offer: 'first' },
      { group: 'garden', kind: 'empty', offer: 'first' },
      { group: 'construction', kind: 'unknown', offer: 'first' },
      { group: 'construction', kind: 'grinder', offer: 'unknown' }
    ]) {
      await expect(offerGet(context(invalid))).rejects.toThrow('not found');
    }

    vi.mocked(loadInventoryData).mockResolvedValue(
      buildInventoryDataset(
        { owners: [ownerEntry()], kinds: [kindEntry()], offers: [] },
        { parcels }
      )
    );
    expect(await offerPaths()).toEqual([]);
    await expect(offerGet(context(params))).rejects.toThrow('not found');
  });

  it('rejects an unknown group or a kind under the wrong group instead of publishing another page', async () => {
    vi.mocked(loadInventoryData).mockResolvedValue(
      buildInventoryDataset({ owners: [], kinds: [kindEntry()], offers: [] }, { parcels })
    );

    await expect(groupGet(context({ group: 'unknown' }))).rejects.toThrow('not found');
    await expect(kindGet(context({ group: 'garden', kind: 'grinder' }))).rejects.toThrow(
      'not found'
    );
    await expect(kindGet(context({ group: 'construction', kind: 'unknown' }))).rejects.toThrow(
      'not found'
    );
  });
});
