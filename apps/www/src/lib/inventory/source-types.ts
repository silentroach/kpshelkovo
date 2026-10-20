import type { RawInventoryKind, RawInventoryOffer, RawInventoryOwner } from './raw-schema';

interface InventoryEntry<T> {
  readonly id: string;
  readonly body?: string;
  readonly data: T;
}

export type InventoryOwnerEntry = InventoryEntry<RawInventoryOwner>;
export type InventoryKindEntry = InventoryEntry<RawInventoryKind>;
export type InventoryOfferEntry = InventoryEntry<RawInventoryOffer>;

export interface InventorySourceEntries {
  readonly owners: readonly InventoryOwnerEntry[];
  readonly kinds: readonly InventoryKindEntry[];
  readonly offers: readonly InventoryOfferEntry[];
}
