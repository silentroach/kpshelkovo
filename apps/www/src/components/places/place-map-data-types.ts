import type { PlaceMapInfraPayloadDto } from '@/lib/places/map-layer-dto';
import type { PlaceMapItem } from '@/lib/places/map-types';

export interface LoadedPlaceMapLayer {
  readonly status: 'loaded';
  readonly places: readonly PlaceMapItem[];
  readonly roads?: PlaceMapInfraPayloadDto['roads'];
}

export type PlaceMapLayerLoad =
  | LoadedPlaceMapLayer
  | { readonly status: 'pending' }
  | { readonly status: 'failed' };
