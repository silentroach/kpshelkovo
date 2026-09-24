import { formatPlainText } from '@shelkovo/markdown';

import type { EditorialFeatureCollection } from './editorial-types';

/** Build-time display copy; keep the domain collection for public data and Markdown. */
export const prepareEditorialGeometry = (
  collection: EditorialFeatureCollection
): EditorialFeatureCollection => ({
  ...collection,
  features: collection.features.map((feature) =>
    feature.geometry.type === 'Point' && feature.iconCaption !== undefined
      ? { ...feature, iconCaption: formatPlainText(feature.iconCaption) }
      : feature
  )
});
