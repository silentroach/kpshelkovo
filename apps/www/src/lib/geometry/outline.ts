import type {
  EditorialPolygonCoordinates,
  EditorialPolygonGeometry,
  EditorialPosition
} from './editorial-types';
import { RawPolygonGeometrySchema } from './raw-polygon-schema';

const METERS_PER_LATITUDE_DEGREE = 111_320;
const OUTLINE_MITER_LIMIT = 1.5;

const signedArea = (points: readonly (readonly [number, number])[]): number =>
  points.reduce((area, point, index) => {
    const next = points[(index + 1) % points.length];
    return next ? area + point[0] * next[1] - next[0] * point[1] : area;
  }, 0);

const edgeNormal = (
  start: readonly [number, number],
  end: readonly [number, number],
  orientation: 1 | -1
): readonly [number, number] => {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const length = Math.hypot(dx, dy);

  return length ? [(orientation * dy) / length, (-orientation * dx) / length] : [0, 0];
};

const offsetRing = (
  ring: readonly EditorialPosition[],
  expansionMeters: number,
  project: (position: EditorialPosition) => readonly [number, number],
  unproject: (position: readonly [number, number]) => EditorialPosition
): readonly EditorialPosition[] => {
  const points = ring.slice(0, -1).map(project);
  const orientation = signedArea(points) > 0 ? 1 : -1;
  const expanded = points.map((point, index): EditorialPosition => {
    const previous = points[(index - 1 + points.length) % points.length];
    const next = points[(index + 1) % points.length];

    if (!previous || !next) return unproject(point);

    const previousNormal = edgeNormal(previous, point, orientation);
    const nextNormal = edgeNormal(point, next, orientation);
    const miterX = previousNormal[0] + nextNormal[0];
    const miterY = previousNormal[1] + nextNormal[1];
    const miterLength = Math.hypot(miterX, miterY);

    if (!miterLength) {
      return unproject([
        point[0] + nextNormal[0] * expansionMeters,
        point[1] + nextNormal[1] * expansionMeters
      ]);
    }

    const directionX = miterX / miterLength;
    const directionY = miterY / miterLength;
    const projection = directionX * nextNormal[0] + directionY * nextNormal[1];
    const uncappedDistance = projection ? expansionMeters / projection : expansionMeters;
    const maximumDistance = Math.abs(expansionMeters) * OUTLINE_MITER_LIMIT;
    const distance =
      Math.abs(uncappedDistance) > maximumDistance
        ? Math.sign(uncappedDistance) * maximumDistance
        : uncappedDistance;

    return unproject([point[0] + directionX * distance, point[1] + directionY * distance]);
  });
  const first = expanded[0];

  return first ? [...expanded, first] : ring;
};

const expandPolygon = (
  polygon: EditorialPolygonCoordinates,
  expansionMeters: number
): EditorialPolygonCoordinates => {
  const outerRing = polygon[0];

  if (!outerRing?.length) return polygon;

  const longitudes = outerRing.map(([lng]) => lng);
  const latitudes = outerRing.map(([, lat]) => lat);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const centerLng = (minLng + maxLng) / 2;
  const centerLat = (minLat + maxLat) / 2;
  const metersPerLongitudeDegree =
    METERS_PER_LATITUDE_DEGREE * Math.cos((centerLat * Math.PI) / 180);
  const project = ([lng, lat]: EditorialPosition): readonly [number, number] => [
    (lng - centerLng) * metersPerLongitudeDegree,
    (lat - centerLat) * METERS_PER_LATITUDE_DEGREE
  ];
  const unproject = ([x, y]: readonly [number, number]): EditorialPosition => [
    centerLng + x / metersPerLongitudeDegree,
    centerLat + y / METERS_PER_LATITUDE_DEGREE
  ];

  const holes = polygon.slice(1).flatMap((ring) => {
    const contracted = offsetRing(ring, -expansionMeters, project, unproject);
    const original = ring.slice(0, -1).map(project);
    const prepared = contracted.slice(0, -1).map(project);
    const area = signedArea(original);
    const preparedArea = signedArea(prepared);
    const reversedEdge = original.some((point, index) => {
      const next = original[(index + 1) % original.length];
      const moved = prepared[index];
      const movedNext = prepared[(index + 1) % prepared.length];
      if (!next || !moved || !movedNext) return true;
      return (
        (next[0] - point[0]) * (movedNext[0] - moved[0]) +
          (next[1] - point[1]) * (movedNext[1] - moved[1]) <=
        0
      );
    });

    // A collapsed hole must disappear, not reappear larger on the other side of its center.
    return area * preparedArea <= 0 ||
      Math.abs(preparedArea) >= Math.abs(area) ||
      reversedEdge ||
      !RawPolygonGeometrySchema.safeParse({ type: 'Polygon', coordinates: [contracted] }).success
      ? []
      : [contracted];
  });

  return [offsetRing(outerRing, expansionMeters, project, unproject), ...holes];
};

export const expandPolygonGeometry = (
  geometry: EditorialPolygonGeometry,
  expansionMeters: number | undefined,
  context: string
): EditorialPolygonGeometry => {
  if (!expansionMeters) return geometry;

  let expanded: EditorialPolygonGeometry;
  switch (geometry.type) {
    case 'Polygon':
      expanded = {
        type: geometry.type,
        coordinates: expandPolygon(geometry.coordinates, expansionMeters)
      };
      break;
    case 'MultiPolygon':
      expanded = {
        type: geometry.type,
        coordinates: geometry.coordinates.map((polygon) => expandPolygon(polygon, expansionMeters))
      };
      break;
    default: {
      const exhaustive: never = geometry;
      return exhaustive;
    }
  }

  const result = RawPolygonGeometrySchema.safeParse(expanded);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `geometry.${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`${context} has invalid prepared geometry: ${details}`);
  }
  return result.data;
};
