import { formatText } from '@shelkovo/typography';
/// <reference types="astro/client" />
import { Window } from 'happy-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { visibleWhitespace } from '@/lib/test/visible-whitespace';
import { createAstroContainer } from '@/test/astro-container';

import type { InventoryDataset } from '../types';
import { inventoryPageFixture } from './fixtures/inventory-page';

const fixture = vi.hoisted(() => ({ data: undefined as InventoryDataset | undefined }));
vi.mock('@/lib/inventory/load', async (original) => ({
  ...(await original<typeof import('../load')>()),
  loadInventoryData: async () => fixture.data
}));
// @ts-expect-error Astro component modules are resolved by Astro/Vitest at test time.
import InventoryOffer from '@/components/inventory/InventoryOffer.astro';
// @ts-expect-error Astro page modules are resolved by Astro/Vitest at test time.
import OfferPage from '@/pages/ukogo/[group]/[kind]/[offer]/index.astro';
// @ts-expect-error Astro page modules are resolved by Astro/Vitest at test time.
import KindPage from '@/pages/ukogo/[group]/[kind]/index.astro';
// @ts-expect-error Astro page modules are resolved by Astro/Vitest at test time.
import GroupPage from '@/pages/ukogo/[group]/index.astro';
// @ts-expect-error Astro page modules are resolved by Astro/Vitest at test time.
import RootPage from '@/pages/ukogo/index.astro';

const parse = (html: string) => {
  const document = new Window().document;
  document.write(html);
  return document;
};
const renderKind = async () =>
  parse(
    await (
      await createAstroContainer()
    ).renderToString(KindPage, {
      params: { group: 'construction', kind: 'drill' },
      request: new Request('https://example.com/ukogo/construction/drill/')
    })
  );

beforeEach(() => {
  fixture.data = inventoryPageFixture();
});

describe('inventory HTML pages', () => {
  it('keeps the offer target when its visible title and price change', async () => {
    const offer = fixture.data?.offers.find((item) => item.id === 'paid');
    if (!offer) throw new Error('fixture offer missing');
    const page = parse(
      await (
        await createAstroContainer()
      ).renderToString(InventoryOffer, {
        props: { offer: { ...offer, title: 'Обновлённая модель', price: { type: 'free' } } }
      })
    );
    expect(page.querySelector('article')?.id).toBe('offer-paid');
    expect(page.querySelector('h2 a')?.getAttribute('href')).toBe(offer.url);
  });

  it('renders all offers with distinct contacts, canonical parcels and all price states', async () => {
    const page = await renderKind();
    const offers = [...page.querySelectorAll('article')];
    expect(
      offers.map((offer) => ({
        id: offer.id,
        title: offer.querySelector('h2 a')?.textContent,
        price: visibleWhitespace(offer.querySelector('.inventory-offer__price')?.textContent),
        parcel: offer.querySelector('a[href*="?p="]')?.getAttribute('href'),
        contacts: [
          ...offer.querySelectorAll('a[href^="tel:"], a[href^="mailto:"], a[href^="https://t.me/"]')
        ].map((link) => link.getAttribute('href'))
      }))
    ).toMatchInlineSnapshot(`
      [
        {
          "contacts": [
            "mailto:anna@example.com",
          ],
          "id": "offer-free",
          "parcel": "/map/?p=SHP-A2",
          "price": "Бесплатно",
          "title": "Дрель Model 200",
        },
        {
          "contacts": [
            "tel:+79969670018",
            "https://t.me/example_boris",
          ],
          "id": "offer-negotiable",
          "parcel": "/map/?p=SHP-A1",
          "price": "Цена по·договорённости",
          "title": "Дрель Model 300",
        },
        {
          "contacts": [
            "tel:+79969670018",
            "https://t.me/example_boris",
          ],
          "id": "offer-paid",
          "parcel": "/map/?p=SHP-A1",
          "price": "1·200·₽/сутки",
          "title": "Дрель Model 100",
        },
      ]
    `);
    expect(offers.map((offer) => offer.querySelector('h2 a')?.getAttribute('href'))).toEqual(
      fixture.data?.byKind.get('drill')?.offers.map((offer) => offer.url)
    );
    const ids = [...page.querySelectorAll('[id]')].map((node) => node.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const offer of fixture.data?.byKind.get('drill')?.offers ?? []) {
      const card = page.getElementById(offer.anchorId);
      expect(card?.querySelector('.inventory-offer__summary')?.textContent).toBe(
        formatText(offer.summary)
      );
      expect(card?.querySelector('a[aria-label^="Подробнее:"]')?.getAttribute('href')).toBe(
        offer.url
      );
    }
    for (const offer of offers) {
      const contacts = offer.querySelector('section[aria-labelledby]');
      expect(contacts?.getAttribute('aria-labelledby')).toBe(`${offer.id}-contacts`);
      expect(page.getElementById(`${offer.id}-contacts`)?.textContent.trim()).toBeTruthy();
      expect(offer.querySelector(`[id^="${offer.id}-body-"]`)).toBeFalsy();
    }
  });

  it('keeps full descriptions out of listings and indexes only the detail editorial content', async () => {
    const listing = await renderKind();
    expect(listing.querySelector('[data-pagefind-body], [data-search-section-id]')).toBeFalsy();
    expect(listing.body.textContent).not.toContain('Вернуть чистым');
    expect(listing.querySelector('article figure, article .ui-prose')).toBeFalsy();
    const page = parse(
      await (
        await createAstroContainer()
      ).renderToString(OfferPage, {
        params: { group: 'construction', kind: 'drill', offer: 'paid' },
        request: new Request('https://example.com/ukogo/construction/drill/paid/')
      })
    );
    const bodies = [...page.querySelectorAll('[data-pagefind-body]')];
    const indexed = bodies.map((node) => node.textContent).join(' ');
    expect({
      kindTitle: indexed.includes('Дрели'),
      model: indexed.includes('Model 100'),
      body: indexed.includes('Вернуть чистым'),
      manualLink: !!listing.querySelector('a[href="/kb/tools/drill/"]'),
      contactInSearch: bodies.some(
        (node) => !!node.querySelector('a[href^="tel:"], a[href^="mailto:"]')
      ),
      photosInSearch: bodies.some((node) => !!node.querySelector('figure')),
      priceInSearch: indexed.includes('₽'),
      ownerInSearch: indexed.includes('Борис'),
      searchSection: page
        .querySelector('[data-search-section-id]')
        ?.getAttribute('data-search-section-id')
    }).toMatchInlineSnapshot(`
      {
        "body": true,
        "contactInSearch": false,
        "kindTitle": true,
        "manualLink": true,
        "model": true,
        "ownerInSearch": false,
        "photosInSearch": false,
        "priceInSearch": false,
        "searchSection": "inventory",
      }
    `);
    expect(page.querySelector('a[href="https://t.me/silentroach"]')).toBeFalsy();
    expect(
      [...page.querySelectorAll('.inventory-photos figure a')].map((link) =>
        link.getAttribute('href')
      )
    ).toEqual(
      fixture.data?.offers.find((offer) => offer.id === 'paid')?.photos.map((photo) => photo.url)
    );
    expect(page.querySelector('main a[href="/ukogo/construction/drill/#offer-paid"]')).toBeTruthy();
    expect(page.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://kpshelkovo.online/ukogo/construction/drill/paid/'
    );
    const content = [...page.querySelectorAll('main a[href^="tel:"], main [data-pagefind-body]')];
    expect(content.findIndex((node) => node.getAttribute('href')?.startsWith('tel:'))).toBeLessThan(
      content.findIndex((node) => node.textContent.includes('Вернуть чистым'))
    );
    const ids = [...page.querySelectorAll('[id]')].map((node) => node.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const link of page.querySelectorAll('main a[href^="#"]')) {
      expect(
        page.getElementById(decodeURIComponent((link.getAttribute('href') ?? '').slice(1)))
      ).toBeTruthy();
    }
  });

  it('does not render removed offers or offers requested through another kind or group', async () => {
    const container = await createAstroContainer();
    for (const params of [
      { group: 'construction', kind: 'drill', offer: 'removed' },
      { group: 'garden', kind: 'mower', offer: 'paid' },
      { group: 'garden', kind: 'drill', offer: 'paid' }
    ]) {
      await expect(container.renderToString(OfferPage, { params })).rejects.toThrow(
        /inventory (offer|kind) not found/
      );
    }
  });

  it('keeps the empty kind body, links, canonical and external indexing without a search document', async () => {
    fixture.data = inventoryPageFixture(true);
    const page = await renderKind();
    expect({
      manualLink: !!page.querySelector('a[href="/kb/tools/drill/"]'),
      bodyAnchor: !!page.getElementById('kind-drill-body-выбор'),
      empty: page.body.textContent.includes('Сейчас нет предложений этого вида.'),
      back: !!page.querySelector('main a[href="/ukogo/"]'),
      offers: page.querySelectorAll('article').length,
      search: page.querySelectorAll('[data-pagefind-body], [data-search-section-id]').length,
      canonical: page.querySelector('link[rel="canonical"]')?.getAttribute('href'),
      robots: page.querySelector('meta[name="robots"]')?.getAttribute('content') ?? 'indexable'
    }).toMatchInlineSnapshot(`
      {
        "back": true,
        "bodyAnchor": true,
        "canonical": "https://kpshelkovo.online/ukogo/construction/drill/",
        "empty": true,
        "manualLink": true,
        "offers": 0,
        "robots": "indexable",
        "search": 0,
      }
    `);
  });

  it('shows grouped direct contents and the root-only invitation, including an empty catalogue', async () => {
    const container = await createAstroContainer();
    const root = parse(
      await container.renderToString(RootPage, {
        request: new Request('https://example.com/ukogo/')
      })
    );
    const group = parse(
      await container.renderToString(GroupPage, {
        params: { group: 'construction' },
        request: new Request('https://example.com/ukogo/construction/')
      })
    );
    const invitation = root.querySelector('a[href="https://t.me/silentroach"]');
    expect({
      rootKinds: [...root.querySelectorAll('main .inventory-kinds li a')].map((node) =>
        node.getAttribute('href')
      ),
      rootGroups: [...root.querySelectorAll('main section h2 a')].map((node) =>
        node.getAttribute('href')
      ),
      groupKinds: [...group.querySelectorAll('main .inventory-kinds li a')].map((node) =>
        node.getAttribute('href')
      ),
      invitation: {
        text: invitation?.textContent,
        accessibleName: invitation?.getAttribute('aria-label'),
        decorativeIcon: !!invitation?.querySelector('svg[aria-hidden="true"]')
      },
      groupInvitation: !!group.querySelector('a[href="https://t.me/silentroach"]'),
      canonical: [root, group].map((page) =>
        page.querySelector('link[rel="canonical"]')?.getAttribute('href')
      ),
      externallyIndexable: [root, group].every(
        (page) => !page.querySelector('meta[name="robots"][content*="noindex"]')
      ),
      searchDocuments:
        root.querySelectorAll('[data-search-section-id]').length +
        group.querySelectorAll('[data-search-section-id]').length
    }).toMatchInlineSnapshot(`
      {
        "canonical": [
          "https://kpshelkovo.online/ukogo/",
          "https://kpshelkovo.online/ukogo/construction/",
        ],
        "externallyIndexable": true,
        "groupInvitation": false,
        "groupKinds": [
          "/ukogo/construction/drill/",
        ],
        "invitation": {
          "accessibleName": "Написать silentroach в Telegram",
          "decorativeIcon": true,
          "text": "silentroach",
        },
        "rootGroups": [
          "/ukogo/construction/",
          "/ukogo/garden/",
        ],
        "rootKinds": [
          "/ukogo/construction/drill/",
          "/ukogo/garden/mower/",
        ],
        "searchDocuments": 0,
      }
    `);
    fixture.data = inventoryPageFixture(true);
    const empty = parse(await container.renderToString(RootPage));
    expect(empty.querySelector('a[href="https://t.me/silentroach"]')).toBeTruthy();
    expect(empty.querySelectorAll('main .inventory-kinds li')).toHaveLength(0);
    const emptyGroup = parse(
      await container.renderToString(GroupPage, { params: { group: 'home' } })
    );
    expect(emptyGroup.querySelector('main a[href="/ukogo/"]')).toBeTruthy();
  });
});
