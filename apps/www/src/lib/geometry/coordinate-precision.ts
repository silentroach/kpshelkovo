import type { EditorialGeometry, EditorialPosition } from './editorial-types';

/** Public degree coordinates; normalize after the last geometric calculation. */
export const normalizeCoordinate = (value: number): number => Number(value.toFixed(8));

export const roundPosition = ([lng, lat]: EditorialPosition): EditorialPosition => [
  normalizeCoordinate(lng),
  normalizeCoordinate(lat)
];

export const roundGeometry = (geometry: EditorialGeometry): EditorialGeometry => {
  switch (geometry.type) {
    case 'Point':
      return { type: 'Point', coordinates: roundPosition(geometry.coordinates) };
    case 'LineString':
      return { type: 'LineString', coordinates: geometry.coordinates.map(roundPosition) };
    case 'Polygon':
      return {
        type: 'Polygon',
        coordinates: geometry.coordinates.map((ring) => ring.map(roundPosition))
      };
    case 'MultiPolygon':
      return {
        type: 'MultiPolygon',
        coordinates: geometry.coordinates.map((polygon) =>
          polygon.map((ring) => ring.map(roundPosition))
        )
      };
    default: {
      const exhaustive: never = geometry;
      return exhaustive;
    }
  }
};
