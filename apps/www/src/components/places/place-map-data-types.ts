import type { PlaceMapLayerPayloadDto } from '@/lib/places/map-layer-dto';
import type { PlaceMapItem } from '@/lib/places/map-types';

export interface LoadedPlaceMapLayer {
  readonly status: 'loaded';
  readonly places: readonly PlaceMapItem[];
  readonly roads?: PlaceMapLayerPayloadDto['roads'];
}

export type PlaceMapLayerLoad =
  | LoadedPlaceMapLayer
  | { readonly status: 'pending' }
  | { readonly status: 'failed' };
