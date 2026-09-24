import { parcelRecordPath } from './source.ts';
import type { ParcelEntry, Parcel } from './types.ts';

export const mapRawParcel = (entry: ParcelEntry): Parcel => {
  const path = parcelRecordPath(entry.data.code).slice(0, -3);
  if (entry.id !== path) {
    throw new Error(`parcel path "${entry.id}" does not match primary code "${entry.data.code}"`);
  }

  const part = entry.data.code.slice(0, 3).toLowerCase() as Parcel['part'];

  return {
    code: entry.data.code,
    aliases: entry.data.aliases,
    part,
    cadastralParts: entry.data.cadastral_parts?.map((part) => ({
      cadastralNumber: part.cadastral_number,
      geometry: part.geometry,
      areaM2: part.area_m2
    })) ?? [
      {
        cadastralNumber: entry.data.cadastral_number!,
        geometry: entry.data.geometry!,
        areaM2: entry.data.area_m2
      }
    ],
    areaM2: entry.data.cadastral_parts
      ? entry.data.cadastral_parts.every((part) => part.area_m2 !== undefined)
        ? entry.data.cadastral_parts.reduce((sum, part) => sum + part.area_m2!, 0)
        : undefined
      : entry.data.area_m2,
    status: entry.data.status,
    features: entry.data.features,
    priceHistory: entry.data.price_history.map(({ on, price }) => ({ on, price })),
    body: entry.body ?? ''
  };
};
