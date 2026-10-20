import { expect, it } from 'vitest';
import { z } from 'zod';

import { catalog } from '@/lib/discovery';
import { build } from '@/lib/llms';
import { llmsPathForPage, publicSurfaceRegistry } from '@/lib/public-surface';
import { applySitemapMetadata, shouldIncludeSitemapPage } from '@/lib/sitemap';

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

it('keeps every HTML level indexable with Markdown negotiation and the root guide', () => {
  const surfaces = publicSurfaceRegistry.surfacesByOwner('inventory');
  expect(surfaces.map((surface) => surface.path ?? surface.routePattern)).toMatchInlineSnapshot(`
    [
      "/ukogo/",
      "/ukogo/index.md",
      "/ukogo/:group/",
      "/ukogo/:group/index.md",
      "/ukogo/:group/:kind/",
      "/ukogo/:group/:kind/index.md",
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
    expect(shouldIncludeSitemapPage(path)).toBe(true);
    expect(applySitemapMetadata({ url: path }, new Map())).toEqual({ url: path });
  }
});
