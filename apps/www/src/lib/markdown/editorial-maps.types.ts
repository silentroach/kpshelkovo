import type { EditorialParcelLabel } from '@/lib/geometry/editorial-map-labels.types';
import type { EditorialFeatureCollection } from '@/lib/geometry/editorial-types';

export interface EditorialMapSelection {
  readonly sets: readonly string[];
  readonly parcels: readonly string[];
  readonly places: readonly string[];
  readonly outline: boolean;
}

export interface EditorialMapResolvedSelection {
  readonly geometry: EditorialFeatureCollection;
  readonly parcelLabels: readonly EditorialParcelLabel[];
}

export type EditorialMapSelectionResolver = (
  selection: EditorialMapSelection,
  context: string
) => EditorialMapResolvedSelection;

export interface EditorialMapBlock {
  /** One-based order among map blocks in the source document. */
  readonly index: number;
  readonly geometry: EditorialFeatureCollection;
  readonly selection?: EditorialMapSelection;
  readonly url?: string;
}
