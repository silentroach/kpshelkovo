/// <reference types="astro/client" />
import { z } from 'astro/zod';
import { Window } from 'happy-dom';
import * as pagefind from 'pagefind';
import { afterAll, describe, expect, it, vi } from 'vitest';

import { createAstroContainer } from '@/test/astro-container';

import { buildInventoryDataset } from '../load';
import type { InventoryDataset } from '../types';
import { kindEntry, offerEntry, ownerEntry, parcels } from './fixtures';

const fixture = vi.hoisted(() => ({ data: undefined as InventoryDataset | undefined }));
vi.mock('@/lib/inventory/load', async (original) => ({
  ...(await original<typeof import('../load')>()),
  loadInventoryData: async () => fixture.data
}));
// @ts-expect-error Astro page modules are resolved by Astro/Vitest at test time.
import OfferPage from '@/pages/ukogo/[group]/[kind]/[offer]/index.astro';
// @ts-expect-error Astro page modules are resolved by Astro/Vitest at test time.
import KindPage from '@/pages/ukogo/[group]/[kind]/index.astro';
// @ts-expect-error Astro page modules are resolved by Astro/Vitest at test time.
import GroupPage from '@/pages/ukogo/[group]/index.astro';
// @ts-expect-error Astro page modules are resolved by Astro/Vitest at test time.
import RootPage from '@/pages/ukogo/index.astro';

const manifestSchema = z.object({
  languages: z.object({ ru: z.object({ page_count: z.number().int().nonnegative() }) })
});

afterAll(async () => {
  await pagefind.close();
});

describe('inventory Pagefind corpus lifecycle', () => {
  it('removes and restores the offer result without indexing catalogue lists', async () => {
    const container = await createAstroContainer();
    const kindUrl = '/ukogo/construction/grinder/';
    const offerUrl = `${kindUrl}fixture-tool/`;
    const pageCounts: number[] = [];
    const externalPolicies: { readonly canonical?: string; readonly robots?: string }[] = [];

    for (const hasOffers of [true, false, true]) {
      fixture.data = buildInventoryDataset(
        {
          owners: [ownerEntry()],
          kinds: [kindEntry()],
          offers: hasOffers ? [offerEntry('fixture-tool', { title: 'Болгарка Fixture Model' })] : []
        },
        { parcels }
      );
      const kindHtml = await container.renderToString(KindPage, {
        params: { group: 'construction', kind: 'grinder' },
        request: new Request(`https://kpshelkovo.online${kindUrl}`)
      });
      const rootHtml = await container.renderToString(RootPage, {
        request: new Request('https://kpshelkovo.online/ukogo/')
      });
      const groupHtml = await container.renderToString(GroupPage, {
        params: { group: 'construction' },
        request: new Request('https://kpshelkovo.online/ukogo/construction/')
      });
      const offerHtml = hasOffers
        ? await container.renderToString(OfferPage, {
            params: { group: 'construction', kind: 'grinder', offer: 'fixture-tool' },
            request: new Request(`https://kpshelkovo.online${offerUrl}`)
          })
        : undefined;

      const window = new Window();
      window.document.write(kindHtml);
      externalPolicies.push({
        canonical:
          window.document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? undefined,
        robots:
          window.document.querySelector('meta[name="robots"]')?.getAttribute('content') ?? undefined
      });
      await window.happyDOM.close();

      const created = await pagefind.createIndex({ rootSelector: '[data-pagefind-root]' });
      expect(created.errors).toEqual([]);
      const index = created.index;
      if (!index) throw new Error('Pagefind did not create the fixture index');
      try {
        // A real corpus keeps other searchable pages when the last offer is removed.
        // Pagefind's global data-pagefind-body rule is applied during getFiles().
        const control = await index.addHTMLFile({
          url: '/fixture-control/',
          content:
            '<html lang="ru"><body><main data-pagefind-root><p data-pagefind-body>Контрольная инструкция</p></main></body></html>'
        });
        expect(control.errors).toEqual([]);
        if (offerHtml) {
          const offer = await index.addHTMLFile({ url: offerUrl, content: offerHtml });
          expect(offer.errors).toEqual([]);
          expect(offer.file.url).toBe(offerUrl);
          expect(offer.file.uniqueWords).toBeGreaterThan(0);
        }
        for (const [url, content] of [
          ['/ukogo/', rootHtml],
          ['/ukogo/construction/', groupHtml],
          [kindUrl, kindHtml]
        ] as const) {
          expect((await index.addHTMLFile({ url, content })).errors).toEqual([]);
        }
        const files = await index.getFiles();
        expect(files.errors).toEqual([]);
        const manifest = files.files.find((file) => file.path === 'pagefind-entry.json');
        if (!manifest) throw new Error('Pagefind did not return the fixture manifest');
        pageCounts.push(
          manifestSchema.parse(JSON.parse(new TextDecoder().decode(manifest.content))).languages.ru
            .page_count
        );
      } finally {
        await index.deleteIndex();
      }
    }

    // Only the control page and an active offer are indexed, never any of the lists.
    expect(pageCounts).toEqual([2, 1, 2]);
    expect(externalPolicies[1]).toEqual(externalPolicies[0]);
    expect(externalPolicies[2]).toEqual(externalPolicies[0]);
    expect(externalPolicies[1]).toMatchInlineSnapshot(`
      {
        "canonical": "https://kpshelkovo.online/ukogo/construction/grinder/",
        "robots": undefined,
      }
    `);
  });
});
