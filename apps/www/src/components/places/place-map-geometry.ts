import type { Feature } from '@yandex/ymaps3-clusterer';
import type {
  LngLat,
  LngLatBounds,
  MultiPolygonGeometry,
  PolygonGeometry,
} from '@yandex/ymaps3-types';

import type { PlaceMapItem } from '@/lib/places/map-types';
import { PLACE_MAP_BOUNDS } from '@/lib/places/schema';
import type {
  PlaceGeometryPosition,
  PlacePolygonGeometry,
} from '@/lib/places/types';

const SETTLEMENT_BOUNDS: LngLatBounds = [
  [PLACE_MAP_BOUNDS.minLng, PLACE_MAP_BOUNDS.minLat],
  [PLACE_MAP_BOUNDS.maxLng, PLACE_MAP_BOUNDS.maxLat],
];
const BOUNDS_PADDING_RATIO = 0.3;
const MARKER_MIN_SCALE = 20 / 32;
const MARKER_MIN_ZOOM = 13.5;
const MARKER_MAX_ZOOM = 16;
const MARKER_CLOSEUP_MAX_ZOOM = 18;
const MARKER_CLOSEUP_MAX_SCALE = 1.3;

const roundCoordinate = (value: number): number => Number(value.toFixed(6));
const copyGeometryRing = (ring: readonly PlaceGeometryPosition[]): LngLat[] =>
  ring.map(([lng, lat]) => [lng, lat]);

export const getPaddedBounds = (
  coordinates: readonly LngLat[],
): LngLatBounds => {
  if (coordinates.length < 2) return SETTLEMENT_BOUNDS;

  const longitudes = coordinates.map(([lng]) => lng);
  const latitudes = coordinates.map(([, lat]) => lat);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const lngPadding = (maxLng - minLng) * BOUNDS_PADDING_RATIO;
  const latPadding = (maxLat - minLat) * BOUNDS_PADDING_RATIO;

  return [
    [
      roundCoordinate(minLng - lngPadding),
      roundCoordinate(minLat - latPadding),
    ],
    [
      roundCoordinate(maxLng + lngPadding),
      roundCoordinate(maxLat + latPadding),
    ],
  ];
};

export const getPlaceBounds = (places: readonly PlaceMapItem[]): LngLatBounds =>
  getPaddedBounds(
    places.map((place): LngLat => [
      place.coordinates.lng,
      place.coordinates.lat,
    ]),
  );

export const getMarkerScale = (zoom: number): number => {
  if (zoom > MARKER_MAX_ZOOM) {
    const closeupProgress = Math.min(
      1,
      (zoom - MARKER_MAX_ZOOM) / (MARKER_CLOSEUP_MAX_ZOOM - MARKER_MAX_ZOOM),
    );

    return 1 + (MARKER_CLOSEUP_MAX_SCALE - 1) * closeupProgress;
  }

  const progress = Math.min(
    1,
    Math.max(0, (zoom - MARKER_MIN_ZOOM) / (MARKER_MAX_ZOOM - MARKER_MIN_ZOOM)),
  );

  return MARKER_MIN_SCALE + (1 - MARKER_MIN_SCALE) * progress;
};

export const toMapGeometry = (
  geometry: PlacePolygonGeometry,
): PolygonGeometry | MultiPolygonGeometry => {
  if (geometry.type === 'Polygon') {
    return {
      type: geometry.type,
      coordinates: geometry.coordinates.map(copyGeometryRing),
    };
  }

  return {
    type: geometry.type,
    coordinates: geometry.coordinates.map((polygon) =>
      polygon.map(copyGeometryRing),
    ),
  };
};

export const createMapFeatures = (places: readonly PlaceMapItem[]): Feature[] =>
  places.map((place) => ({
    type: 'Feature',
    id: place.slug,
    geometry: {
      type: 'Point',
      coordinates: [place.coordinates.lng, place.coordinates.lat],
    },
  }));
