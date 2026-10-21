import { compareRuText, formatNumberUnitRu } from '@shelkovo/format';

import type { InventoryDataset, InventoryGroup, InventoryKind, InventoryPrice } from './types';

export const inventoryContentsGroups = (dataset: InventoryDataset): readonly InventoryGroup[] =>
  dataset.groups.filter((group) => group.kinds.length > 0);

export const inventoryOwnerKinds = (
  dataset: InventoryDataset,
  ownerId: string
): readonly InventoryKind[] =>
  dataset.kinds.flatMap((kind) => {
    const offers = dataset.offers
      .filter((offer) => offer.kindId === kind.id && offer.owner.id === ownerId)
      .sort((a, b) => compareRuText(a.title, b.title) || compareRuText(a.id, b.id));
    return offers.length > 0 ? [{ ...kind, offers }] : [];
  });

export const formatInventoryPrice = (price: InventoryPrice): string => {
  switch (price.type) {
    case 'free':
      return 'Бесплатно';
    case 'negotiable':
      return 'Цена по договорённости';
    case 'fixed': {
      const amount = formatNumberUnitRu(price.value, '₽', { maximumFractionDigits: 2 });
      switch (price.period) {
        case 'hour':
          return `${amount}/час`;
        case 'day':
          return `${amount}/сутки`;
        case 'once':
          return `${amount} разово`;
        default: {
          const exhaustive: never = price.period;
          return exhaustive;
        }
      }
    }
    default: {
      const exhaustive: never = price;
      return exhaustive;
    }
  }
};
