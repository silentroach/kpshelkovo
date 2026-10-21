import { describe, expect, it } from 'vitest';

import { createSiteMentionRegistry } from '@/lib/mentions';
import { createPersonMentionTarget } from '@/lib/people/mentions';

import { buildInventoryDataset } from '../load';
import type { InventorySourceEntries } from '../source-types';
import { inventoryContentsGroups } from '../view';
import { kindEntry, offerEntry, ownerEntry, parcels } from './fixtures';

describe('inventory dataset', () => {
  it('keeps owner links when name, parcel and contacts change', () => {
    const before = buildInventoryDataset(
      { owners: [ownerEntry()], kinds: [], offers: [] },
      { parcels }
    );
    const after = buildInventoryDataset(
      {
        owners: [
          ownerEntry('anna', {
            name: 'Другое имя',
            parcel: 'SHR-L44',
            contacts: { email: 'new@example.com' }
          })
        ],
        kinds: [],
        offers: []
      },
      { parcels: new Map([...parcels, ['SHR-L44', { code: 'SHR-L44' }]]) }
    );
    const owner = after.byOwner.get('anna');
    expect(owner).toMatchInlineSnapshot(`
      {
        "canonical": "https://kpshelkovo.online/ukogo/owners/anna/",
        "contacts": {
          "email": "new@example.com",
          "phone": undefined,
          "telegram": undefined,
          "website": undefined,
          "whatsapp": undefined,
        },
        "id": "anna",
        "markdownUrl": "/ukogo/owners/anna/index.md",
        "name": "Другое имя",
        "parcel": {
          "code": "SHR-L44",
          "url": "/map/?p=SHR-L44",
        },
        "url": "/ukogo/owners/anna/",
      }
    `);
    expect([owner?.url, owner?.markdownUrl, owner?.canonical]).toEqual([
      before.byOwner.get('anna')?.url,
      before.byOwner.get('anna')?.markdownUrl,
      before.byOwner.get('anna')?.canonical
    ]);
  });

  it('indexes owners with equal names independently and retains an owner after the last offer', () => {
    const owners = [ownerEntry('anna-2'), ownerEntry()];
    const kinds = [kindEntry()];
    const populated = buildInventoryDataset({ owners, kinds, offers: [offerEntry()] }, { parcels });
    const empty = buildInventoryDataset({ owners, kinds, offers: [] }, { parcels });
    expect(populated.owners.map((owner) => [owner.id, owner.url])).toMatchInlineSnapshot(`
      [
        [
          "anna",
          "/ukogo/owners/anna/",
        ],
        [
          "anna-2",
          "/ukogo/owners/anna-2/",
        ],
      ]
    `);
    expect(empty.byOwner.get('anna')).toEqual(populated.byOwner.get('anna'));
    expect(empty.byOwner.get('anna-2')).toBe(empty.owners[1]);
    expect(populated.offers[0]?.owner).toBe(populated.byOwner.get('anna'));
    expect(empty.byOwner.get('unknown')).toBeUndefined();
    const removed = buildInventoryDataset({ owners: [], kinds, offers: [] }, { parcels });
    expect(removed.byOwner.get('anna')).toBeUndefined();
  });

  it('resolves aliases, shares owners and orders full offers by owner then stable ID', () => {
    const dataset = buildInventoryDataset(
      {
        owners: [ownerEntry('yakov', { name: 'Яков', parcel: 'SHR-L43' }), ownerEntry()],
        kinds: [kindEntry('vacuum', { title: 'Пылесос', group: 'home' }), kindEntry()],
        offers: [
          offerEntry('yakov-grinder', { owner: 'yakov', price: 0 }),
          offerEntry('anna-second', { price: { value: 500, period: 'day' } }),
          offerEntry('anna-first')
        ]
      },
      { parcels }
    );

    expect(
      dataset.kinds.map((kind) => [kind.id, kind.offers.map((offer) => [offer.id, offer.price])])
    ).toMatchInlineSnapshot(`
      [
        [
          "grinder",
          [
            [
              "anna-first",
              {
                "type": "negotiable",
              },
            ],
            [
              "anna-second",
              {
                "period": "day",
                "type": "fixed",
                "value": 500,
              },
            ],
            [
              "yakov-grinder",
              {
                "type": "free",
              },
            ],
          ],
        ],
        [
          "vacuum",
          [],
        ],
      ]
    `);
    expect(dataset.offers[0]?.owner).toBe(dataset.offers[1]?.owner);
    expect(dataset.offers.find((offer) => offer.owner.id === 'anna')?.owner.parcel)
      .toMatchInlineSnapshot(`
      {
        "code": "SHR-L43",
        "url": "/map/?p=SHR-L43",
      }
    `);
    expect(inventoryContentsGroups(dataset).map((group) => group.id)).toEqual(['construction']);
  });

  it('updates editorial text, price and shared contacts without changing detail or listing links', () => {
    const input = {
      owners: [ownerEntry()],
      kinds: [kindEntry()],
      offers: [offerEntry('a'), offerEntry('b')]
    };
    const before = buildInventoryDataset(input, { parcels });
    const after = buildInventoryDataset(
      {
        owners: [ownerEntry('anna', { name: 'Новое имя', contacts: { email: 'new@example.com' } })],
        kinds: input.kinds,
        offers: input.offers.map((offer) =>
          offerEntry(
            offer.id,
            { title: 'Другая модель', summary: 'Другой комплект.', price: 0 },
            'Новый комплект.'
          )
        )
      },
      { parcels }
    );
    expect(after.offers.map((offer) => [offer.owner.contacts, offer.url, offer.bodyIdPrefix]))
      .toMatchInlineSnapshot(`
      [
        [
          {
            "email": "new@example.com",
            "phone": undefined,
            "telegram": undefined,
            "website": undefined,
            "whatsapp": undefined,
          },
          "/ukogo/construction/grinder/a/",
          "offer-a-body-",
        ],
        [
          {
            "email": "new@example.com",
            "phone": undefined,
            "telegram": undefined,
            "website": undefined,
            "whatsapp": undefined,
          },
          "/ukogo/construction/grinder/b/",
          "offer-b-body-",
        ],
      ]
    `);
    const links = (dataset: ReturnType<typeof buildInventoryDataset>) =>
      dataset.offers.map((offer) => [
        offer.url,
        offer.markdownUrl,
        offer.canonical,
        offer.anchorId,
        offer.listingUrl
      ]);
    expect(links(after)).toEqual(links(before));
    expect(after.offers.map((offer) => [offer.summary, offer.body])).toMatchInlineSnapshot(`
      [
        [
          "Другой комплект.",
          "Новый комплект.",
        ],
        [
          "Другой комплект.",
          "Новый комплект.",
        ],
      ]
    `);
  });

  it('uses the source kind ID for detail URLs and retains only active offers as route inputs', () => {
    const owners = [ownerEntry()];
    const kinds = [kindEntry('circular-saws', { title: 'Циркулярные пилы' })];
    const offers = [
      offerEntry('saw-a', { kind: 'circular-saws' }),
      offerEntry('saw-b', { kind: 'circular-saws' })
    ];
    const full = buildInventoryDataset({ owners, kinds, offers }, { parcels });
    const remaining = buildInventoryDataset(
      { owners, kinds, offers: offers.slice(1) },
      { parcels }
    );
    const empty = buildInventoryDataset({ owners, kinds, offers: [] }, { parcels });
    expect(
      full.offers.map((offer) => [offer.url, offer.markdownUrl, offer.canonical, offer.listingUrl])
    ).toMatchInlineSnapshot(`
      [
        [
          "/ukogo/construction/circular-saws/saw-a/",
          "/ukogo/construction/circular-saws/saw-a/index.md",
          "https://kpshelkovo.online/ukogo/construction/circular-saws/saw-a/",
          "/ukogo/construction/circular-saws/#offer-saw-a",
        ],
        [
          "/ukogo/construction/circular-saws/saw-b/",
          "/ukogo/construction/circular-saws/saw-b/index.md",
          "https://kpshelkovo.online/ukogo/construction/circular-saws/saw-b/",
          "/ukogo/construction/circular-saws/#offer-saw-b",
        ],
      ]
    `);
    expect(remaining.offers.map((offer) => offer.id)).toEqual(['saw-b']);
    expect(empty.offers).toEqual([]);
    expect(empty.byKind.get('circular-saws')?.url).toBe(full.byKind.get('circular-saws')?.url);
  });

  it('retains all pages and body when one and then the last offer are removed, and restores contents', () => {
    const owners = [ownerEntry()];
    const kinds = [kindEntry(), kindEntry('vacuum', { group: 'home', title: 'Пылесос' })];
    const offers = [offerEntry('a'), offerEntry('b')];
    const one = buildInventoryDataset({ owners, kinds, offers: offers.slice(0, 1) }, { parcels });
    expect(one.byKind.get('grinder')?.offers.map((offer) => offer.id)).toEqual(['a']);
    const empty = buildInventoryDataset({ owners, kinds, offers: [] }, { parcels });
    expect(empty.groups.map((group) => [group.id, group.kinds.length])).toMatchInlineSnapshot(`
      [
        [
          "construction",
          0,
        ],
        [
          "garden",
          0,
        ],
        [
          "home",
          0,
        ],
      ]
    `);
    expect(empty.byKind.get('grinder')?.body).toBe(one.byKind.get('grinder')?.body);
    expect(empty.byKind.get('grinder')?.url).toBe(one.byKind.get('grinder')?.url);
    expect(inventoryContentsGroups(empty)).toEqual([]);
    expect(empty.kinds).toHaveLength(2);
    const restored = buildInventoryDataset({ owners, kinds, offers }, { parcels });
    expect(restored.byGroup.get('construction')?.kinds.map((kind) => kind.id)).toEqual(['grinder']);
  });

  it('sorts kinds alphabetically inside group contents, independently of input order', () => {
    const dataset = buildInventoryDataset(
      {
        owners: [ownerEntry()],
        kinds: [kindEntry('plane', { title: 'Рубанок' }), kindEntry()],
        offers: [offerEntry('plane', { kind: 'plane' }), offerEntry()]
      },
      { parcels }
    );
    expect(dataset.byGroup.get('construction')?.kinds.map((kind) => kind.id)).toEqual([
      'grinder',
      'plane'
    ]);
  });

  it('prepares bodies through shared mentions and preserves manual links and per-entity prefixes', () => {
    const registry = createSiteMentionRegistry([createPersonMentionTarget('neighbor', 'Сосед')]);
    const dataset = buildInventoryDataset(
      {
        owners: [ownerEntry()],
        kinds: [kindEntry('grinder', undefined, 'Поможет @neighbor. [Статья](/kb/tool/).')],
        offers: [offerEntry('a', undefined, 'Обратитесь к @neighbor.')]
      },
      { parcels, mentionRegistry: registry }
    );
    expect(
      dataset.kinds.map((kind) => [
        kind.body,
        kind.bodyIdPrefix,
        kind.mentions.map((mention) => mention.slug)
      ])
    ).toMatchInlineSnapshot(`
      [
        [
          "Поможет [Сосед](/people/neighbor/). [Статья](/kb/tool/).",
          "kind-grinder-body-",
          [
            "neighbor",
          ],
        ],
      ]
    `);
    expect(dataset.offers[0]?.body).toContain('/people/neighbor/');
    expect(() =>
      buildInventoryDataset(
        {
          owners: [ownerEntry()],
          kinds: [kindEntry()],
          offers: [offerEntry('a', undefined, '@unknown')]
        },
        { parcels }
      )
    ).toThrow(/offers\/a\.md/);
  });

  it.each([
    [
      'owner',
      { owners: [], kinds: [kindEntry()], offers: [offerEntry()] },
      'inventory offer "offers/grinder-a.md" references unknown owner "anna"'
    ],
    [
      'kind',
      { owners: [ownerEntry()], kinds: [], offers: [offerEntry()] },
      'inventory offer "offers/grinder-a.md" references unknown kind "grinder"'
    ],
    [
      'parcel',
      { owners: [ownerEntry('anna', { parcel: 'SHR-MISSING' })], kinds: [], offers: [] },
      'inventory owner "owners/anna.md" references unknown parcel "SHR-MISSING"'
    ]
  ] satisfies readonly (readonly [string, InventorySourceEntries, string])[])(
    'rejects an unknown %s with its source',
    (_type, entries, message) => {
      expect(() => buildInventoryDataset(entries, { parcels })).toThrow(message);
    }
  );

  it.each([
    ['owners', { owners: [ownerEntry(), ownerEntry()], kinds: [], offers: [] }],
    ['kinds', { owners: [], kinds: [kindEntry(), kindEntry()], offers: [] }],
    ['offers', { owners: [], kinds: [], offers: [offerEntry(), offerEntry()] }]
  ] satisfies readonly (readonly [string, InventorySourceEntries])[])(
    'rejects duplicate IDs in %s before resolving references',
    (directory, entries) => {
      expect(() => buildInventoryDataset(entries, { parcels })).toThrow(
        new RegExp(`duplicate inventory id.*${directory}/`)
      );
    }
  );

  it('accepts an empty dataset with all group routes', () => {
    const dataset = buildInventoryDataset({ owners: [], kinds: [], offers: [] }, { parcels });
    expect(dataset.groups.map((group) => group.url)).toEqual([
      '/ukogo/construction/',
      '/ukogo/garden/',
      '/ukogo/home/'
    ]);
    expect(dataset.offers).toEqual([]);
  });

  it('keeps each gallery with its offer and preserves image dimensions, alt and caption', () => {
    const photos = [
      {
        url: 'https://media.kpshelkovo.online/ukogo/a/front.jpeg',
        width: 640,
        height: 480,
        alt: 'Комплект спереди',
        caption: 'С диском'
      },
      {
        url: 'https://media.kpshelkovo.online/ukogo/a/back.jpeg',
        width: 480,
        height: 640,
        alt: 'Комплект сзади'
      }
    ];
    const dataset = buildInventoryDataset(
      {
        owners: [ownerEntry()],
        kinds: [kindEntry()],
        offers: [offerEntry('a', { photos }), offerEntry('b')]
      },
      { parcels }
    );
    expect(dataset.offers.find((offer) => offer.id === 'a')?.photos).toMatchInlineSnapshot(`
      [
        {
          "alt": "Комплект спереди",
          "caption": "С диском",
          "height": 480,
          "url": "https://media.kpshelkovo.online/ukogo/a/front.jpeg",
          "width": 640,
        },
        {
          "alt": "Комплект сзади",
          "caption": undefined,
          "height": 640,
          "url": "https://media.kpshelkovo.online/ukogo/a/back.jpeg",
          "width": 480,
        },
      ]
    `);
    expect(dataset.offers.find((offer) => offer.id === 'b')?.photos).toEqual([]);
  });
});
