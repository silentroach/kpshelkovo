import { ParcelDetailsPublicSchema, type ParcelDetailsPublicDto } from './details-public-schema';
import type { Parcel } from './types';

export const buildParcelDetailsPayload = (parcel: Parcel): ParcelDetailsPublicDto =>
  ParcelDetailsPublicSchema.parse({
    code: parcel.code,
    part: parcel.part,
    status: parcel.status,
    areaM2: parcel.areaM2,
    priceHistory: parcel.priceHistory.map(({ on, price }) => ({ on, price }))
  });
