import type { ParcelEntry, Parcel } from './types';

export const mapRawParcel = (entry: ParcelEntry): Parcel => {
  const path = entry.data.code.toLowerCase().replace('-', '/');
  if (entry.id !== path) {
    throw new Error(`parcel path "${entry.id}" does not match primary code "${entry.data.code}"`);
  }

  const part = entry.data.code.slice(0, 3).toLowerCase() as Parcel['part'];

  return {
    code: entry.data.code,
    aliases: entry.data.aliases,
    part,
    cadastralNumber: entry.data.cadastral_number,
    geometry: entry.data.geometry,
    areaM2: entry.data.area_m2,
    status: entry.data.status,
    features: entry.data.features,
    priceHistory: entry.data.price_history.map(({ on, price }) => ({ on, price })),
    body: entry.body ?? ''
  };
};
