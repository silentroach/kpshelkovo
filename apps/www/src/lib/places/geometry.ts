import { RawPlaceGeometrySchema } from './raw-geometry-schema';
import { PLACE_SLUG } from './schema';
import type {
  PlaceGeometry,
  PlaceGeometryPosition,
  PlacePolygonCoordinates,
  PlacePolygonGeometry,
} from './types';

const GEOJSON_EXTENSION = '.geojson';
const METERS_PER_LATITUDE_DEGREE = 111_320;
const OUTLINE_MITER_LIMIT = 1.5;

const edgeNormal = (
  start: readonly [number, number],
  end: readonly [number, number],
  orientation: 1 | -1,
): readonly [number, number] => {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const length = Math.hypot(dx, dy);

  return length
    ? [(orientation * dy) / length, (-orientation * dx) / length]
    : [0, 0];
};

const offsetRing = (
  ring: readonly PlaceGeometryPosition[],
  expansionMeters: number,
  project: (position: PlaceGeometryPosition) => readonly [number, number],
  unproject: (position: readonly [number, number]) => PlaceGeometryPosition,
): readonly PlaceGeometryPosition[] => {
  const points = ring.slice(0, -1).map(project);
  const signedArea = points.reduce((area, point, index) => {
    const next = points[(index + 1) % points.length];

    return next ? area + point[0] * next[1] - next[0] * point[1] : area;
  }, 0);
  const orientation = signedArea > 0 ? 1 : -1;
  const expanded = points.map((point, index): PlaceGeometryPosition => {
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
        point[1] + nextNormal[1] * expansionMeters,
      ]);
    }

    const directionX = miterX / miterLength;
    const directionY = miterY / miterLength;
    const projection = directionX * nextNormal[0] + directionY * nextNormal[1];
    const uncappedDistance = projection
      ? expansionMeters / projection
      : expansionMeters;
    const maximumDistance = Math.abs(expansionMeters) * OUTLINE_MITER_LIMIT;
    const distance =
      Math.abs(uncappedDistance) > maximumDistance
        ? Math.sign(uncappedDistance) * maximumDistance
        : uncappedDistance;

    return unproject([
      point[0] + directionX * distance,
      point[1] + directionY * distance,
    ]);
  });
  const first = expanded[0];

  return first ? [...expanded, first] : ring;
};

const expandPolygon = (
  polygon: PlacePolygonCoordinates,
  expansionMeters: number,
): PlacePolygonCoordinates => {
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
  const project = ([lng, lat]: PlaceGeometryPosition): readonly [
    number,
    number,
  ] => [
    (lng - centerLng) * metersPerLongitudeDegree,
    (lat - centerLat) * METERS_PER_LATITUDE_DEGREE,
  ];
  const unproject = ([x, y]: readonly [
    number,
    number,
  ]): PlaceGeometryPosition => [
    centerLng + x / metersPerLongitudeDegree,
    centerLat + y / METERS_PER_LATITUDE_DEGREE,
  ];

  return polygon.map((ring, index) =>
    offsetRing(
      ring,
      index === 0 ? expansionMeters : -expansionMeters,
      project,
      unproject,
    ),
  );
};

const expandGeometry = (
  geometry: PlacePolygonGeometry,
  expansionMeters?: number,
): PlacePolygonGeometry => {
  if (!expansionMeters) return geometry;

  switch (geometry.type) {
    case 'Polygon':
      return {
        type: geometry.type,
        coordinates: expandPolygon(geometry.coordinates, expansionMeters),
      };
    case 'MultiPolygon':
      return {
        type: geometry.type,
        coordinates: geometry.coordinates.map((polygon) =>
          expandPolygon(polygon, expansionMeters),
        ),
      };
  }
};

const geometrySlug = (filePath: string): string => {
  const fileName = filePath.split('/').at(-1) ?? '';
  const slug = fileName.endsWith(GEOJSON_EXTENSION)
    ? fileName.slice(0, -GEOJSON_EXTENSION.length)
    : '';

  if (!PLACE_SLUG.test(slug)) {
    throw new Error(
      `place geometry path "${filePath}" must use [slug].geojson with a canonical place slug`,
    );
  }

  return slug;
};

const parseJson = (filePath: string, source: string): unknown => {
  try {
    return JSON.parse(source);
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : 'unknown error';

    throw new Error(
      `place geometry "${filePath}" is not valid JSON: ${message}`,
    );
  }
};

const mapPlaceGeometry = (filePath: string, source: string): PlaceGeometry => {
  const result = RawPlaceGeometrySchema.safeParse(parseJson(filePath, source));

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
      .join('; ');

    throw new Error(`place geometry "${filePath}" is invalid: ${details}`);
  }

  const feature = result.data.features[0];

  return {
    area: {
      precision: feature.properties.precision,
      source: feature.properties.source,
      geometry: expandGeometry(
        feature.geometry,
        feature.properties.outline_expansion_meters,
      ),
    },
  };
};

export const parsePlaceGeometryFiles = (
  files: Readonly<Record<string, string>>,
): ReadonlyMap<string, PlaceGeometry> => {
  const geometries = new Map<string, PlaceGeometry>();

  for (const [filePath, source] of Object.entries(files)) {
    const slug = geometrySlug(filePath);

    if (geometries.has(slug)) {
      throw new Error(`duplicate place geometry for slug "${slug}"`);
    }

    geometries.set(slug, mapPlaceGeometry(filePath, source));
  }

  return geometries;
};
