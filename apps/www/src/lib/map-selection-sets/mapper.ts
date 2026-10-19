import type { RawMapSelectionSet } from './raw-schema';
import type { MapSelectionSet } from './types';

export const mapRawSelectionSet = (id: string, raw: RawMapSelectionSet): MapSelectionSet => ({
  id,
  parcelCodes: raw.parcels,
  placeSlugs: raw.places,
  setIds: raw.sets,
  outline: raw.outline
});
