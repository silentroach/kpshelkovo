import type { Feature } from '@yandex/ymaps3-clusterer';
import type { LngLat, LngLatBounds } from '@yandex/ymaps3-types';

import type { EditorialPublicGeometry } from '@/lib/geometry/editorial-public-schema';
import type { EditorialFeatureCollection } from '@/lib/geometry/editorial-types';
import type { PlaceMapItem } from '@/lib/places/map-types';
import { PLACE_MAP_BOUNDS } from '@/lib/places/schema';

const SETTLEMENT_BOUNDS: LngLatBounds = [
  [PLACE_MAP_BOUNDS.minLng, PLACE_MAP_BOUNDS.minLat],
  [PLACE_MAP_BOUNDS.maxLng, PLACE_MAP_BOUNDS.maxLat]
];
const BOUNDS_PADDING_RATIO = 0.3;
const MARKER_MIN_SCALE = 20 / 32;
const MARKER_MIN_ZOOM = 13.5;
const MARKER_MAX_ZOOM = 16;
const MARKER_CLOSEUP_MAX_ZOOM = 18;
const MARKER_CLOSEUP_MAX_SCALE = 1.3;

const roundCoordinate = (value: number): number => Number(value.toFixed(6));

export const getPaddedBounds = (coordinates: readonly LngLat[]): LngLatBounds => {
  if (coordinates.length === 0) return SETTLEMENT_BOUNDS;

  const longitudes = coordinates.map(([lng]) => lng);
  const latitudes = coordinates.map(([, lat]) => lat);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const lngPadding = (maxLng - minLng) * BOUNDS_PADDING_RATIO || 0.001;
  const latPadding = (maxLat - minLat) * BOUNDS_PADDING_RATIO || 0.001;

  return [
    [
      roundCoordinate(Math.max(-180, minLng - lngPadding)),
      roundCoordinate(Math.max(-90, minLat - latPadding))
    ],
    [
      roundCoordinate(Math.min(180, maxLng + lngPadding)),
      roundCoordinate(Math.min(90, maxLat + latPadding))
    ]
  ];
};

export const getPlaceBounds = (places: readonly PlaceMapItem[]): LngLatBounds =>
  getPaddedBounds(places.map((place): LngLat => [place.coordinates.lng, place.coordinates.lat]));

export const getMarkerScale = (zoom: number): number => {
  if (zoom > MARKER_MAX_ZOOM) {
    const closeupProgress = Math.min(
      1,
      (zoom - MARKER_MAX_ZOOM) / (MARKER_CLOSEUP_MAX_ZOOM - MARKER_MAX_ZOOM)
    );

    return 1 + (MARKER_CLOSEUP_MAX_SCALE - 1) * closeupProgress;
  }

  const progress = Math.min(
    1,
    Math.max(0, (zoom - MARKER_MIN_ZOOM) / (MARKER_MAX_ZOOM - MARKER_MIN_ZOOM))
  );

  return MARKER_MIN_SCALE + (1 - MARKER_MIN_SCALE) * progress;
};

/** The public collection already contains prepared coordinates; only property names change here. */
export const fromPublicEditorialGeometry = (
  collection: EditorialPublicGeometry
): EditorialFeatureCollection => ({
  type: 'FeatureCollection',
  metadata: collection.metadata,
  features: collection.features.map((feature) => ({
    type: 'Feature',
    id: feature.id,
    geometry: feature.geometry,
    description: feature.properties.description,
    iconCaption: feature.properties.iconCaption,
    iconContent: feature.properties.iconContent,
    markerColor: feature.properties['marker-color'],
    stroke: feature.properties.stroke,
    strokeWidth: feature.properties['stroke-width'],
    strokeOpacity: feature.properties['stroke-opacity'],
    strokeDasharray: feature.properties['stroke-dasharray'],
    fill: feature.properties.fill,
    fillOpacity: feature.properties['fill-opacity'],
    precision: feature.properties.precision
  }))
});

export const createMapFeatures = (places: readonly PlaceMapItem[]): Feature[] =>
  places.map((place) => ({
    type: 'Feature',
    id: place.slug,
    geometry: {
      type: 'Point',
      coordinates: [place.coordinates.lng, place.coordinates.lat]
    }
  }));
