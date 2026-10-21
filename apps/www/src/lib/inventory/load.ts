import { compareRuText } from '@shelkovo/format';

import { loadSiteMentionRegistry } from '@/lib/mentions/registry';
import { loadParcelsData } from '@/lib/parcels/load';

import { INVENTORY_GROUPS, formatInventoryGroup, isInventoryGroup } from './groups';
import { mapRawInventoryKind, mapRawInventoryOffer, mapRawInventoryOwner } from './mapper';
import { inventoryGroupCanonical, inventoryGroupMarkdownUrl, inventoryGroupUrl } from './routes';
import { isInventoryId } from './schema';
import type { InventorySourceEntries } from './source-types';
import type { InventoryBuildOptions, InventoryDataset, InventoryOffer } from './types';

const indexEntries = <T extends { readonly id: string }>(
  entries: readonly T[],
  directory: string
): ReadonlyMap<string, T> => {
  const index = new Map<string, T>();
  for (const entry of entries) {
    if (!isInventoryId(entry.id))
      throw new Error(`inventory source "${directory}/${entry.id}.md" has invalid id`);
    if (index.has(entry.id))
      throw new Error(`duplicate inventory id "${entry.id}" in "${directory}/${entry.id}.md"`);
    index.set(entry.id, entry);
  }
  return index;
};

const compareOffers = (a: InventoryOffer, b: InventoryOffer): number =>
  compareRuText(a.owner.name, b.owner.name) || compareRuText(a.id, b.id);

export const buildInventoryDataset = (
  input: InventorySourceEntries,
  options: InventoryBuildOptions
): InventoryDataset => {
  indexEntries(input.owners, 'owners');
  const kindEntries = indexEntries(input.kinds, 'kinds');
  indexEntries(input.offers, 'offers');
  const registry = options.mentionRegistry ?? new Map();
  for (const entry of input.kinds) {
    if (!isInventoryGroup(entry.data.group))
      throw new Error(
        `inventory kind "kinds/${entry.id}.md" references unknown group "${entry.data.group}"`
      );
  }
  const owners = input.owners
    .map((entry) => {
      const parcel = options.parcels.get(entry.data.parcel);
      if (!parcel)
        throw new Error(
          `inventory owner "owners/${entry.id}.md" references unknown parcel "${entry.data.parcel}"`
        );
      return mapRawInventoryOwner(entry, parcel.code);
    })
    .sort((a, b) => compareRuText(a.name, b.name) || compareRuText(a.id, b.id));
  const byOwner = new Map(owners.map((owner) => [owner.id, owner]));
  const offers = input.offers
    .map((entry) => {
      const owner = byOwner.get(entry.data.owner);
      if (!owner)
        throw new Error(
          `inventory offer "offers/${entry.id}.md" references unknown owner "${entry.data.owner}"`
        );
      const kind = kindEntries.get(entry.data.kind);
      if (!kind)
        throw new Error(
          `inventory offer "offers/${entry.id}.md" references unknown kind "${entry.data.kind}"`
        );
      return mapRawInventoryOffer(entry, owner, kind, registry);
    })
    .sort(compareOffers);
  const kinds = input.kinds
    .map((entry) =>
      mapRawInventoryKind(
        entry,
        offers.filter((offer) => offer.kindId === entry.id),
        registry
      )
    )
    .sort((a, b) => compareRuText(a.title, b.title) || compareRuText(a.id, b.id));
  const groups = INVENTORY_GROUPS.map((id) => ({
    id,
    title: formatInventoryGroup(id),
    kinds: kinds.filter((kind) => kind.group === id && kind.offers.length > 0),
    url: inventoryGroupUrl({ group: id }),
    markdownUrl: inventoryGroupMarkdownUrl({ group: id }),
    canonical: inventoryGroupCanonical({ group: id })
  }));
  return {
    owners,
    kinds,
    offers,
    groups,
    byGroup: new Map(groups.map((group) => [group.id, group])),
    byKind: new Map(kinds.map((kind) => [kind.id, kind])),
    byOwner
  };
};

let cache: Promise<InventoryDataset> | undefined;

export const loadInventoryData = (): Promise<InventoryDataset> => {
  cache ??= Promise.all([
    import('astro:content').then(async ({ getCollection }) => ({
      owners: await getCollection('inventoryOwners'),
      kinds: await getCollection('inventoryKinds'),
      offers: await getCollection('inventoryOffers')
    })),
    loadParcelsData(),
    loadSiteMentionRegistry()
  ]).then(([entries, parcels, mentionRegistry]) =>
    buildInventoryDataset(entries, { parcels: parcels.byCode, mentionRegistry })
  );
  return cache;
};
