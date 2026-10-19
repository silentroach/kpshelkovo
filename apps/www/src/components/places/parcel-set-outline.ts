import { unionPolygonGeometries } from '@shelkovo/geo';
import type { MultiPolygonGeometry, YMapFeature } from '@yandex/ymaps3-types';

import { normalizeCoordinate } from '@/lib/geometry/coordinate-precision';

import type { ParcelMapItem } from './parcel-layer-types';

/** Loaded only when a set explicitly requests the union outline. */
export const createParcelSetOutline = (
  sdk: typeof ymaps3,
  geometries: readonly ParcelMapItem['geometry'][],
  color: string
): YMapFeature => {
  const merged = unionPolygonGeometries(geometries);
  const polygons = merged.type === 'Polygon' ? [merged.coordinates] : merged.coordinates;
  const geometry: MultiPolygonGeometry = {
    type: 'MultiPolygon',
    coordinates: polygons.map((polygon) =>
      polygon.map((ring) =>
        ring.map(([lng, lat]) => [normalizeCoordinate(lng), normalizeCoordinate(lat)])
      )
    )
  };
  return new sdk.YMapFeature({
    id: 'parcel-selection-set-outline',
    geometry,
    style: {
      zIndex: -1,
      interactive: false,
      simplificationRate: 0,
      fillOpacity: 0,
      stroke: [
        { color: 'oklch(100% 0 0)', width: 6, opacity: 0.85 },
        { color, width: 3, opacity: 0.95 }
      ]
    }
  });
};
