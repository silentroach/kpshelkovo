import { describe, expect, it } from 'vitest';

import { buildInventoryDataset } from '../load';
import { inventoryOwnerOffers } from '../view';
import { kindEntry, offerEntry, ownerEntry, parcels } from './fixtures';

describe('owner inventory selection', () => {
  it('selects only the owner offers and sorts across kinds by model title then ID', () => {
    const dataset = buildInventoryDataset(
      {
        owners: [ownerEntry(), ownerEntry('anna-2')],
        kinds: [
          kindEntry('vacuum', { title: 'Пылесос', group: 'home' }),
          kindEntry(),
          kindEntry('plane', { title: 'Рубанок' })
        ],
        offers: [
          offerEntry('a', { title: 'Яркая модель' }),
          offerEntry('c', { title: 'Аккумуляторная модель' }),
          offerEntry('b', { title: 'Аккумуляторная модель' }),
          offerEntry('vacuum-a', { kind: 'vacuum', title: 'Моющий пылесос' }),
          offerEntry('other-grinder', { owner: 'anna-2' }),
          offerEntry('other-vacuum', { owner: 'anna-2', kind: 'vacuum' }),
          offerEntry('other-plane', { owner: 'anna-2', kind: 'plane' })
        ]
      },
      { parcels }
    );
    const originalOrder = dataset.offers.map((offer) => offer.id);
    const selected = inventoryOwnerOffers(dataset, 'anna');
    expect(selected.map((offer) => offer.id)).toMatchInlineSnapshot(`
      [
        "b",
        "c",
        "vacuum-a",
        "a",
      ]
    `);
    expect(inventoryOwnerOffers(dataset, 'anna-2').map((offer) => offer.id)).toMatchInlineSnapshot(`
      [
        "other-grinder",
        "other-plane",
        "other-vacuum",
      ]
    `);
    expect(dataset.offers.map((offer) => offer.id)).toEqual(originalOrder);
    expect(selected[0]).toBe(dataset.offers.find((offer) => offer.id === 'b'));
    expect(dataset.byKind.get('grinder')?.offers).toHaveLength(4);
  });

  it('returns no offers for unused or unknown owners and after removal of the last offer', () => {
    const owners = [ownerEntry(), ownerEntry('unused')];
    const kinds = [kindEntry()];
    const populated = buildInventoryDataset({ owners, kinds, offers: [offerEntry()] }, { parcels });
    expect(inventoryOwnerOffers(populated, 'unused')).toEqual([]);
    expect(inventoryOwnerOffers(populated, 'unknown')).toEqual([]);
    const empty = buildInventoryDataset({ owners, kinds, offers: [] }, { parcels });
    expect(inventoryOwnerOffers(empty, 'anna')).toEqual([]);
  });
});
