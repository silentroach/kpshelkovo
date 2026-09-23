import { RawEditorialGeometrySchema } from './editorial-schema';
import type { RawEditorialGeometry } from './editorial-schema';
import type { EditorialFeatureCollection, EditorialGeometry } from './editorial-types';
import { expandPolygonGeometry } from './outline';

const mapGeometry = (
  geometry: RawEditorialGeometry['features'][number]['geometry'],
  expansion: number | undefined,
  context: string
): EditorialGeometry => {
  switch (geometry.type) {
    case 'Point':
    case 'LineString':
      return geometry;
    case 'Polygon':
    case 'MultiPolygon':
      return expandPolygonGeometry(geometry, expansion, context);
    default: {
      const exhaustive: never = geometry;
      return exhaustive;
    }
  }
};

export const mapEditorialGeometry = (
  raw: RawEditorialGeometry,
  source: string
): EditorialFeatureCollection => ({
  type: 'FeatureCollection',
  metadata: raw.metadata,
  features: raw.features.map((feature, index) => ({
    type: 'Feature',
    id: feature.id,
    geometry: mapGeometry(
      feature.geometry,
      feature.properties.outline_expansion_meters,
      `editorial geometry "${source}" feature ${index}${feature.id === undefined ? '' : ` (ID ${JSON.stringify(feature.id)})`}`
    ),
    description: feature.properties.description,
    iconCaption: feature.properties.iconCaption,
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

/** Validate at a source boundary and retain the source, feature index, ID and field in diagnostics. */
export const parseEditorialGeometry = (
  input: unknown,
  source: string
): EditorialFeatureCollection => {
  const result = RawEditorialGeometrySchema.safeParse(input);
  if (!result.success) {
    const features =
      input && typeof input === 'object' && 'features' in input && Array.isArray(input.features)
        ? input.features
        : [];
    const details = result.error.issues
      .map((issue) => {
        const index =
          issue.path[0] === 'features' && typeof issue.path[1] === 'number'
            ? issue.path[1]
            : undefined;
        const candidate = index === undefined ? undefined : features[index];
        const id =
          candidate &&
          typeof candidate === 'object' &&
          'id' in candidate &&
          (typeof candidate.id === 'string' || typeof candidate.id === 'number')
            ? ` (ID ${JSON.stringify(candidate.id)})`
            : '';
        const path = issue.path.join('.') || 'root';
        const fields =
          issue.code === 'unrecognized_keys'
            ? issue.keys.map((key) => `${path}.${key}`).join(', ')
            : path;
        return `${fields}${index === undefined ? '' : ` [feature ${index}${id}]`}: ${issue.message}`;
      })
      .join('; ');
    throw new Error(`editorial geometry "${source}" is invalid: ${details}`);
  }
  return mapEditorialGeometry(result.data, source);
};
