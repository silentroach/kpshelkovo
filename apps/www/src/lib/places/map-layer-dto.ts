import type { RoadMapPublicDto } from '@/lib/roads/map-public-schema';

import type { PlaceMapPublicPayloadDto } from './map-public-dto';
import type { PlaceMapLayer } from './schema';

export interface PlaceMapBasePayloadDto extends PlaceMapPublicPayloadDto {
  readonly placeLayers: Readonly<Partial<Record<PlaceMapLayer, readonly string[]>>>;
}

export interface PlaceMapLayerPayloadDto extends PlaceMapPublicPayloadDto {
  readonly roads?: Readonly<RoadMapPublicDto>;
}
