import { EditorialPublicGeometrySchema } from './editorial-public-schema';
import type { EditorialPublicGeometry } from './editorial-public-schema';
import type { EditorialFeatureCollection } from './editorial-types';

export const toPublicEditorialGeometry = (
  collection: EditorialFeatureCollection
): EditorialPublicGeometry =>
  EditorialPublicGeometrySchema.parse({
    type: 'FeatureCollection',
    metadata: collection.metadata,
    features: collection.features.map((feature) => ({
      type: 'Feature',
      id: feature.id,
      geometry: feature.geometry,
      properties: {
        description: feature.description,
        iconCaption: feature.iconCaption,
        'marker-color': feature.markerColor,
        stroke: feature.stroke,
        'stroke-width': feature.strokeWidth,
        'stroke-opacity': feature.strokeOpacity,
        'stroke-dasharray': feature.strokeDasharray,
        fill: feature.fill,
        'fill-opacity': feature.fillOpacity,
        precision: feature.precision
      }
    }))
  });
