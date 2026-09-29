import { ParcelDetailsPublicSchema, type ParcelDetailsPublicDto } from './details-public-schema';
import type { Parcel } from './types';

export const buildParcelDetailsPayload = (parcel: Parcel): ParcelDetailsPublicDto =>
  ParcelDetailsPublicSchema.parse({
    code: parcel.code,
    status: parcel.status,
    area: parcel.areaM2,
    price: {
      last: parcel.priceHistory.at(-1)?.price,
      history: parcel.priceHistory.map(({ on, price }) => [on, price])
    }
  });
