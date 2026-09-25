import { formatPlainText } from '@shelkovo/markdown';

import type { EditorialFeatureCollection } from './editorial-types';

/** Prepare only visible point captions; the editorial collection remains unchanged. */
export const prepareEditorialGeometry = (
  collection: EditorialFeatureCollection
): EditorialFeatureCollection => ({
  type: 'FeatureCollection',
  metadata: collection.metadata,
  features: collection.features.map((feature) =>
    feature.geometry.type === 'Point' && feature.iconCaption !== undefined
      ? { ...feature, iconCaption: formatPlainText(feature.iconCaption) }
      : feature
  )
});
