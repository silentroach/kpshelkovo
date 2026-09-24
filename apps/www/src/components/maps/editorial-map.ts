import { formatDynamicHtml } from '@shelkovo/markdown';
import type {
  DrawingStyle,
  LineStringGeometry,
  LngLat,
  LngLatBounds,
  MultiPolygonGeometry,
  PolygonGeometry,
  YMapFeature,
  YMapMarker
} from '@yandex/ymaps3-types';

import type {
  EditorialFeature,
  EditorialFeatureCollection,
  EditorialGeometry,
  EditorialPosition
} from '@/lib/geometry/editorial-types';

import './editorial-map.css';

const copyPosition = ([lng, lat]: EditorialPosition): LngLat => [lng, lat];
const copyRing = (ring: readonly EditorialPosition[]): LngLat[] => ring.map(copyPosition);
const formatCaptionText = (value: string): string => {
  const escaped = value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  const decoder = document.createElement('textarea');
  decoder.innerHTML = formatDynamicHtml(escaped);
  return decoder.value;
};

const toMapGeometry = (
  geometry: Exclude<EditorialGeometry, { readonly type: 'Point' }>
): LineStringGeometry | PolygonGeometry | MultiPolygonGeometry => {
  switch (geometry.type) {
    case 'LineString':
      return { type: 'LineString', coordinates: geometry.coordinates.map(copyPosition) };
    case 'Polygon':
      return { type: 'Polygon', coordinates: geometry.coordinates.map(copyRing) };
    case 'MultiPolygon':
      return {
        type: 'MultiPolygon',
        coordinates: geometry.coordinates.map((polygon) => polygon.map(copyRing))
      };
    default: {
      const exhaustive: never = geometry;
      return exhaustive;
    }
  }
};

const drawingStyle = (feature: EditorialFeature): DrawingStyle => {
  const style: DrawingStyle = { interactive: false, simplificationRate: 0, fillRule: 'evenodd' };
  if (feature.fill !== undefined) style.fill = feature.fill;
  if (feature.fillOpacity !== undefined) style.fillOpacity = feature.fillOpacity;
  if (
    feature.stroke !== undefined ||
    feature.strokeWidth !== undefined ||
    feature.strokeOpacity !== undefined ||
    feature.strokeDasharray !== undefined
  ) {
    const stroke: NonNullable<DrawingStyle['stroke']>[number] = {};
    if (feature.stroke !== undefined) stroke.color = feature.stroke;
    if (feature.strokeWidth !== undefined) stroke.width = feature.strokeWidth;
    if (feature.strokeOpacity !== undefined) stroke.opacity = feature.strokeOpacity;
    if (feature.strokeDasharray !== undefined) stroke.dash = [...feature.strokeDasharray];
    style.stroke = [stroke];
  }
  return style;
};

/** Build independent objects: callers own their visibility, lifetime and map controls. */
export const createEditorialMapObjects = (
  maps: typeof ymaps3,
  collection: EditorialFeatureCollection
): (YMapFeature | YMapMarker)[] =>
  collection.features.map((feature) => {
    if (feature.geometry.type === 'Point') {
      const marker = document.createElement('div');
      marker.className = 'editorial-map-marker';
      const dot = document.createElement('span');
      dot.className = 'editorial-map-marker__dot ui-map-marker';
      if (feature.iconContent !== undefined) dot.textContent = feature.iconContent;
      if (feature.markerColor !== undefined)
        dot.style.setProperty('--ui-map-marker-color', feature.markerColor);
      marker.append(dot);
      if (feature.iconCaption !== undefined) {
        const caption = document.createElement('span');
        caption.className = 'editorial-map-marker__caption';
        caption.textContent = formatCaptionText(feature.iconCaption);
        marker.append(caption);
      }
      return new maps.YMapMarker(
        { coordinates: copyPosition(feature.geometry.coordinates) },
        marker
      );
    }
    return new maps.YMapFeature({
      geometry: toMapGeometry(feature.geometry),
      style: drawingStyle(feature)
    });
  });

/** Undefined means there is no geometry to frame; extra coordinates can include a primary marker. */
export const getEditorialMapBounds = (
  collection: EditorialFeatureCollection,
  extraCoordinates: readonly LngLat[] = []
): LngLatBounds | undefined => {
  const positions: readonly EditorialPosition[] = collection.features.flatMap(({ geometry }) => {
    switch (geometry.type) {
      case 'Point':
        return [geometry.coordinates];
      case 'LineString':
        return geometry.coordinates;
      case 'Polygon':
        return geometry.coordinates.flat();
      case 'MultiPolygon':
        return geometry.coordinates.flat(2);
      default: {
        const exhaustive: never = geometry;
        return exhaustive;
      }
    }
  });
  if (positions.length === 0 && extraCoordinates.length === 0) return;

  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const [lng, lat] of [...positions, ...extraCoordinates]) {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
  const lngPadding = (maxLng - minLng) * 0.3 || 0.001;
  const latPadding = (maxLat - minLat) * 0.3 || 0.001;
  const round = (value: number): number => Number(value.toFixed(6));
  return [
    [round(Math.max(-180, minLng - lngPadding)), round(Math.max(-90, minLat - latPadding))],
    [round(Math.min(180, maxLng + lngPadding)), round(Math.min(90, maxLat + latPadding))]
  ];
};
