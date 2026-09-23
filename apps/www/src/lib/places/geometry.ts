import { parseEditorialGeometry } from '@/lib/geometry/editorial-mapper';

import { PLACE_SLUG } from './schema';
import type { PlaceGeometry } from './types';

const GEOJSON_EXTENSION = '.geojson';

const geometrySlug = (filePath: string): string => {
  const fileName = filePath.split('/').at(-1) ?? '';
  const slug = fileName.endsWith(GEOJSON_EXTENSION)
    ? fileName.slice(0, -GEOJSON_EXTENSION.length)
    : '';

  if (!PLACE_SLUG.test(slug)) {
    throw new Error(
      `place geometry path "${filePath}" must use [slug].geojson with a canonical place slug`
    );
  }

  return slug;
};

const parseJson = (filePath: string, source: string): unknown => {
  try {
    return JSON.parse(source);
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : 'unknown error';

    throw new Error(`place geometry "${filePath}" is not valid JSON: ${message}`);
  }
};

const mapPlaceGeometry = (filePath: string, source: string): PlaceGeometry =>
  parseEditorialGeometry(parseJson(filePath, source), `place geometry "${filePath}"`);

export const parsePlaceGeometryFiles = (
  files: Readonly<Record<string, string>>
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
