import type { ParcelPart } from '@/lib/parcels/schema';

export interface ParcelSearchEntry {
  readonly code: string;
  readonly aliases: readonly string[];
  readonly part: ParcelPart;
}

export interface ParcelSearchFeed {
  readonly parcels: readonly ParcelSearchEntry[];
}

export interface SiteSearchDependencies {
  readonly pagefind: import('./client.types').SearchClient;
  readonly loadParcels?: () => Promise<ParcelSearchFeed>;
}
