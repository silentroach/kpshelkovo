import type { ParcelLabelItem } from '@/components/places/parcel-label.types';
import type { MapSelectionSetPublicDto } from '@/lib/map-selection-sets/public-types';
import type { Place } from '@/lib/places/types';

import type { EditorialPolygonGeometry, EditorialPosition } from './editorial-types';

export interface EditorialMapParcel extends ParcelLabelItem {
  readonly geometry: EditorialPolygonGeometry;
  readonly labelCoordinates: EditorialPosition;
}

export interface EditorialMapSelectionSources {
  /** The full prepared map payload, never recomputed for an individual selection. */
  readonly parcels: readonly EditorialMapParcel[];
  readonly places: readonly Pick<
    Place,
    'slug' | 'name' | 'showOnMap' | 'coordinates' | 'geometry'
  >[];
  readonly sets: readonly MapSelectionSetPublicDto[];
}
