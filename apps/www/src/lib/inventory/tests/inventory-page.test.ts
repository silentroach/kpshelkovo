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
import OwnerPage, {
  getStaticPaths as ownerStaticPaths
  // @ts-expect-error Astro page modules are resolved by Astro/Vitest at test time.
} from '@/pages/ukogo/owners/[owner]/index.astro';

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
const renderOwner = async (owner: string) =>
  parse(
    await (
      await createAstroContainer()
    ).renderToString(OwnerPage, {
      params: { owner },
      request: new Request(`https://example.com/ukogo/owners/${owner}/`)
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

  it('renders owners, canonical parcels and all prices without contact actions in listings', async () => {
    const page = await renderKind();
    const offers = [...page.querySelectorAll('article')];
    expect(
      offers.map((offer) => ({
        id: offer.id,
        title: offer.querySelector('h2 a')?.textContent,
        price: visibleWhitespace(offer.querySelector('.inventory-offer__price')?.textContent),
        parcel: offer.querySelector('a[href*="?p="]')?.getAttribute('href')
      }))
    ).toMatchInlineSnapshot(`
      [
        {
          "id": "offer-free",
          "parcel": "/map/?p=SHP-A2",
          "price": "Бесплатно",
          "title": "Дрель Model 200",
        },
        {
          "id": "offer-negotiable",
          "parcel": "/map/?p=SHP-A1",
          "price": "Цена по·договорённости",
          "title": "Дрель Model 300",
        },
        {
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
    expect(
      page.querySelectorAll(
        'article a[href^="tel:"], article a[href^="mailto:"], article a[href^="https://t.me/"]'
      )
    ).toHaveLength(0);
    for (const offer of fixture.data?.byKind.get('drill')?.offers ?? []) {
      const card = page.getElementById(offer.anchorId);
      expect(card?.querySelector('.inventory-offer__summary')?.textContent).toBe(
        formatText(offer.summary)
      );
      expect(card?.querySelector('.inventory-offer__owner')?.textContent).toContain(
        offer.owner.name
      );
      expect(card?.querySelector('.inventory-offer__owner a')?.getAttribute('href')).toBe(
        offer.owner.url
      );
    }
    for (const offer of offers) {
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
    const contacts = page.querySelector('section[aria-labelledby="offer-paid-contacts"]');
    expect(page.getElementById('offer-paid-contacts')?.textContent.trim()).toBeTruthy();
    expect([...contacts!.querySelectorAll('a')].map((link) => link.getAttribute('href')))
      .toMatchInlineSnapshot(`
        [
          "tel:+79969670018",
          "https://t.me/example_boris",
        ]
      `);
    expect(
      [...page.querySelectorAll('.inventory-photos figure a')].map((link) =>
        link.getAttribute('href')
      )
    ).toEqual(
      fixture.data?.offers.find((offer) => offer.id === 'paid')?.photos.map((photo) => photo.url)
    );
    expect(page.querySelector('main nav a[href="/ukogo/construction/drill/"]')).toBeTruthy();
    expect(
      page.querySelector('.inventory-detail__terms a[href="/ukogo/owners/boris/"]')?.textContent
    ).toBe('Борис');
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

  it('keeps contact and the first photo before detail body, without duplicating gallery images', async () => {
    const container = await createAstroContainer();
    const observations = [];
    for (const offerId of ['paid', 'free', 'negotiable']) {
      const page = parse(
        await container.renderToString(OfferPage, {
          params: { group: 'construction', kind: 'drill', offer: offerId },
          request: new Request(`https://example.com/ukogo/construction/drill/${offerId}/`)
        })
      );
      const main = page.querySelector('main');
      if (!main) throw new Error('detail main missing');
      const sequence = [
        ...main.querySelectorAll(
          'a[href^="tel:"], a[href^="mailto:"], figure, .inventory-detail__description .ui-prose'
        )
      ].map((node) =>
        node.tagName === 'FIGURE'
          ? 'photo'
          : node.classList.contains('ui-prose')
            ? 'body'
            : 'contact'
      );
      const images = [...main.querySelectorAll('figure a')].map((node) =>
        node.getAttribute('href')
      );
      const offer = fixture.data?.offers.find((item) => item.id === offerId);
      expect(images).toEqual(offer?.photos.map((photo) => photo.url));
      observations.push({
        offerId,
        price: visibleWhitespace(
          main.querySelector('.inventory-detail__price')?.textContent.trim()
        ),
        sequence
      });
    }
    expect(observations).toMatchInlineSnapshot(`
      [
        {
          "offerId": "paid",
          "price": "1·200·₽/сутки",
          "sequence": [
            "contact",
            "photo",
            "body",
            "photo",
          ],
        },
        {
          "offerId": "free",
          "price": "Бесплатно",
          "sequence": [
            "contact",
            "body",
          ],
        },
        {
          "offerId": "negotiable",
          "price": "Цена по·договорённости",
          "sequence": [
            "contact",
            "photo",
            "body",
          ],
        },
      ]
    `);
  });

  it('lists only the selected owner offers with a kind link per card and one shared contact block', async () => {
    const anna = await renderOwner('anna');
    const boris = await renderOwner('boris');
    expect(
      [anna, boris].map((page) => ({
        name: page.querySelector('main h1')?.textContent,
        kinds: [...page.querySelectorAll('article .inventory-offer__kind a')].map((link) =>
          link.getAttribute('href')
        ),
        models: [...page.querySelectorAll('article h2 > a')].map((link) =>
          link.getAttribute('href')
        ),
        parcel: page.querySelector('main a[href^="/map/?p="]')?.getAttribute('href'),
        contactBlocks: [...page.querySelectorAll('main section[aria-labelledby$="-contacts"]')].map(
          (section) => section.getAttribute('aria-labelledby')
        ),
        canonical: page.querySelector('link[rel="canonical"]')?.getAttribute('href')
      }))
    ).toMatchInlineSnapshot(`
      [
        {
          "canonical": "https://kpshelkovo.online/ukogo/owners/anna/",
          "contactBlocks": [
            "owner-anna-contacts",
          ],
          "kinds": [
            "/ukogo/garden/mower/",
            "/ukogo/construction/drill/",
          ],
          "models": [
            "/ukogo/garden/mower/garden/",
            "/ukogo/construction/drill/free/",
          ],
          "name": "Анна",
          "parcel": "/map/?p=SHP-A2",
        },
        {
          "canonical": "https://kpshelkovo.online/ukogo/owners/boris/",
          "contactBlocks": [
            "owner-boris-contacts",
          ],
          "kinds": [
            "/ukogo/construction/drill/",
            "/ukogo/construction/drill/",
          ],
          "models": [
            "/ukogo/construction/drill/paid/",
            "/ukogo/construction/drill/negotiable/",
          ],
          "name": "Борис",
          "parcel": "/map/?p=SHP-A1",
        },
      ]
    `);
    for (const [ownerId, page] of [
      ['anna', anna],
      ['boris', boris]
    ] as const) {
      const owner = fixture.data?.byOwner.get(ownerId);
      if (!owner) throw new Error('fixture owner missing');
      expect(page.querySelector('main nav [aria-current="page"]')?.textContent).toContain(
        owner.name
      );
      const expected = fixture.data?.offers.filter((offer) => offer.owner.id === ownerId) ?? [];
      const cards = [...page.querySelectorAll('article')];
      expect(cards.map((card) => card.id).sort()).toEqual(
        expected.map((offer) => offer.anchorId).sort()
      );
      for (const offer of expected) {
        const card = page.getElementById(offer.anchorId);
        expect(card?.querySelector('h2')?.id).toBe(`${offer.anchorId}-title`);
        const kind = fixture.data?.byKind.get(offer.kindId);
        expect(card?.querySelector('h2 .inventory-offer__kind a')?.getAttribute('href')).toBe(
          kind?.url
        );
        expect(card?.querySelector('h2 .inventory-offer__kind a')?.textContent).toBe(
          formatText(kind?.title ?? '')
        );
        expect(card?.getAttribute('aria-labelledby')).toBe(`${offer.anchorId}-title`);
        expect(card?.querySelector('.inventory-offer__summary')?.textContent).toBe(
          formatText(offer.summary)
        );
        expect(card?.querySelector('.inventory-offer__price')?.textContent.trim()).toBeTruthy();
        expect(card?.querySelector('img')?.getAttribute('alt')).toBe(
          offer.photos[0] ? formatText(offer.photos[0].alt) : undefined
        );
        if (offer.photos.length > 0) {
          expect(card?.querySelector('a:has(img)')?.getAttribute('href')).toBe(offer.url);
        }
      }
      expect(
        page.querySelectorAll(
          'article h3, article .inventory-offer__owner, article a[href^="/map/"], article a[href^="tel:"], article a[href^="mailto:"], article a[href^="https://t.me/"], article .ui-prose, article figure'
        )
      ).toHaveLength(0);
      expect(page.querySelector(`[aria-labelledby="owner-${ownerId}-contacts"] a`)).toBeTruthy();
      expect(page.getElementById(`owner-${ownerId}-contacts`)?.textContent.trim()).toBeTruthy();
      expect(
        page.querySelector(
          'a[href="https://t.me/silentroach"], [data-pagefind-body], [data-search-section-id], meta[name="robots"][content*="noindex"]'
        )
      ).toBeFalsy();
      const ids = [...page.querySelectorAll('[id]')].map((node) => node.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const section of page.querySelectorAll('main section[aria-labelledby]')) {
        expect(page.getElementById(section.getAttribute('aria-labelledby') ?? '')).toBeTruthy();
      }
    }
    expect([...anna.querySelectorAll('main nav a')].map((link) => link.getAttribute('href')))
      .toMatchInlineSnapshot(`
      [
        "/",
        "/ukogo/",
      ]
    `);
    expect(anna.querySelector('main a[href="/ukogo/owners/"]')).toBeFalsy();
  });

  it('retains an empty owner header and contacts without a duplicate back link', async () => {
    fixture.data = inventoryPageFixture(true);
    expect(await ownerStaticPaths()).toMatchInlineSnapshot(`
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
    const page = await renderOwner('boris');
    expect({
      name: page.querySelector('main h1')?.textContent,
      parcel: page.querySelector('main a[href^="/map/?p="]')?.getAttribute('href'),
      phone: page.querySelector('main a[href^="tel:"]')?.getAttribute('href'),
      empty: page
        .querySelector('main')
        ?.textContent.includes('Сейчас нет предложений этого владельца.'),
      offers: page.querySelectorAll('article').length,
      backLinks: page.querySelectorAll('main a[href="/ukogo/"]').length,
      canonical: page.querySelector('link[rel="canonical"]')?.getAttribute('href')
    }).toMatchInlineSnapshot(`
      {
        "backLinks": 1,
        "canonical": "https://kpshelkovo.online/ukogo/owners/boris/",
        "empty": true,
        "name": "Борис",
        "offers": 0,
        "parcel": "/map/?p=SHP-A1",
        "phone": "tel:+79969670018",
      }
    `);
  });

  it('rejects a missing or deleted owner instead of showing another owner page', async () => {
    await expect(renderOwner('missing')).rejects.toThrow('inventory owner not found');
    const data = inventoryPageFixture(true);
    fixture.data = {
      ...data,
      owners: data.owners.filter((owner) => owner.id !== 'boris'),
      byOwner: new Map(
        data.owners.filter((owner) => owner.id !== 'boris').map((owner) => [owner.id, owner])
      )
    };
    await expect(renderOwner('boris')).rejects.toThrow('inventory owner not found');
    expect(await ownerStaticPaths()).toMatchInlineSnapshot(`
      [
        {
          "params": {
            "owner": "anna",
          },
        },
      ]
    `);
    expect((await renderOwner('anna')).querySelector('main h1')?.textContent).toBe('Анна');
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
