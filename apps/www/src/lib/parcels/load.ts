import { getCollection } from 'astro:content';

import { mapRawParcel } from './mapper';
import type { ParcelEntry, Parcel, ParcelsDataset } from './types';

export const buildParcelsDataset = (entries: readonly ParcelEntry[]): ParcelsDataset => {
  const parcels = entries.map(mapRawParcel).sort((a, b) => a.code.localeCompare(b.code));
  const byCode = new Map<string, Parcel>();
  const byCadastralNumber = new Map<string, Parcel>();

  for (const parcel of parcels) {
    for (const code of [parcel.code, ...parcel.aliases]) {
      const previous = byCode.get(code);
      if (previous) {
        throw new Error(
          `parcel code "${code}" conflicts between "${previous.code}" and "${parcel.code}"`
        );
      }
      byCode.set(code, parcel);
    }

    const previous = byCadastralNumber.get(parcel.cadastralNumber);
    if (previous) {
      throw new Error(
        `parcel cadastral number "${parcel.cadastralNumber}" conflicts between "${previous.code}" and "${parcel.code}"`
      );
    }
    byCadastralNumber.set(parcel.cadastralNumber, parcel);
  }

  return { parcels, byCode, byCadastralNumber };
};

let cache: Promise<ParcelsDataset> | undefined;

export const loadParcelsData = (): Promise<ParcelsDataset> =>
  (cache ??= getCollection('parcels').then(buildParcelsDataset));
