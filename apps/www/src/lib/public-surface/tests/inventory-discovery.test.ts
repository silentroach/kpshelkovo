import type { APIContext } from 'astro';
import { createContext } from 'astro/middleware';
import { expect, it, vi } from 'vitest';
import { z } from 'zod';

import { catalog } from '@/lib/discovery';
import * as inventoryLoad from '@/lib/inventory/load';
import { ownerEntry, kindEntry, offerEntry, parcels } from '@/lib/inventory/tests/fixtures';
import { build } from '@/lib/llms';
import { llmsPathForPage, publicSurfaceRegistry } from '@/lib/public-surface';
import { applySitemapMetadata, shouldIncludeSitemapPage } from '@/lib/sitemap';
import { GET, getStaticPaths } from '@/pages/ukogo/owners/[owner]/index.md';

const ownerContext = (owner: string): APIContext =>
  createContext({
    request: new Request(`https://kpshelkovo.online/ukogo/owners/${owner}/index.md`),
    params: { owner },
    defaultLocale: 'ru'
  });

it('discovers the inventory Markdown entry without inventing a feed or section guide', () => {
  const payload = z
    .object({
      linkset: z.array(
        z.object({
          anchor: z.url(),
          item: z.array(z.object({ href: z.url(), type: z.string() })).optional()
        })
      )
    })
    .parse(catalog('https://example.com'));
  expect(payload.linkset.find((entry) => entry.anchor === 'https://example.com/ukogo/'))
    .toMatchInlineSnapshot(`
      {
        "anchor": "https://example.com/ukogo/",
        "item": [
          {
            "href": "https://example.com/ukogo/index.md",
            "type": "text/markdown",
          },
        ],
      }
    `);
  expect(build()).toContain('](https://kpshelkovo.online/ukogo/index.md)');
  expect(build()).not.toMatch(/\/ukogo\/(?:llms\.txt|.*\.json)|apps\/www|src\/data/);
});

it('keeps Markdown negotiation and the root guide at every HTML level', () => {
  const surfaces = publicSurfaceRegistry.surfacesByOwner('inventory');
  expect(surfaces.map((surface) => surface.path ?? surface.routePattern)).toMatchInlineSnapshot(`
    [
      "/ukogo/",
      "/ukogo/index.md",
      "/ukogo/:group/",
      "/ukogo/:group/index.md",
      "/ukogo/:group/:kind/",
      "/ukogo/:group/:kind/index.md",
      "/ukogo/owners/:owner/",
      "/ukogo/owners/:owner/index.md",
      "/ukogo/:group/:kind/:offer/",
      "/ukogo/:group/:kind/:offer/index.md",
    ]
  `);
  for (const surface of surfaces.filter((item) => item.mediaType === 'text/html')) {
    const path = surface.path ?? surface.routePattern;
    expect(surface.acceptsNegotiation).toBe('required');
    expect(surface.linkRelations).toEqual([
      { rel: 'alternate', href: `${path}index.md`, mediaType: 'text/markdown' },
      { rel: 'describedby', href: llmsPathForPage(path), mediaType: 'text/plain' }
    ]);
    expect(shouldIncludeSitemapPage(path)).toBe(
      !['inventory:owner', 'inventory:offer'].includes(surface.id)
    );
    expect(applySitemapMetadata({ url: path }, new Map())).toEqual({ url: path });
  }
});

it('generates companions for populated and empty owners, but not deleted or unknown owners', async () => {
  const data = inventoryLoad.buildInventoryDataset(
    {
      owners: [ownerEntry(), ownerEntry('boris', { name: 'Борис' })],
      kinds: [kindEntry()],
      offers: [offerEntry()]
    },
    { parcels }
  );
  const load = vi.spyOn(inventoryLoad, 'loadInventoryData').mockResolvedValue(data);
  try {
    const paths = await getStaticPaths();
    expect(paths).toMatchInlineSnapshot(`
      [
        {
          "params": {
            "owner": "anna",
          },
        },
        {
          "params": {
            "owner": "boris",
          },
        },
      ]
    `);
    for (const { params } of paths) {
      const owner = data.byOwner.get(params.owner)!;
      expect(owner.markdownUrl).toBe(`/ukogo/owners/${params.owner}/index.md`);
      expect(owner.canonical).toBe(`https://kpshelkovo.online/ukogo/owners/${params.owner}/`);
      expect(shouldIncludeSitemapPage(owner.canonical)).toBe(false);
      const response = await GET(ownerContext(params.owner));
      expect(response.headers.get('content-type')).toBe('text/markdown; charset=utf-8');
      const text = await response.text();
      expect(text).toContain(owner.canonical);
      expect(text.includes('Пока нет предложений.')).toBe(params.owner === 'boris');
    }
    await expect(GET(ownerContext('missing'))).rejects.toThrow(
      'inventory owner "missing" not found'
    );
    load.mockResolvedValue(
      inventoryLoad.buildInventoryDataset(
        { owners: [ownerEntry()], kinds: [kindEntry()], offers: [offerEntry()] },
        { parcels }
      )
    );
    expect((await getStaticPaths()).map(({ params }) => params.owner)).toEqual(['anna']);
    await expect(GET(ownerContext('boris'))).rejects.toThrow('inventory owner "boris" not found');
  } finally {
    load.mockRestore();
  }
});
