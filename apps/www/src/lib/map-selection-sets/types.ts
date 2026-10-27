import type { EditorialFeatureCollection } from '@/lib/geometry/editorial-types';

export interface ResolvedMapSelectionSet {
  readonly id: string;
  readonly parcelCodes: readonly string[];
  readonly placeSlugs: readonly string[];
  readonly outline: boolean;
  /** Prepared geometry owned by this definition, never inherited from nested sets. */
  readonly geometry?: EditorialFeatureCollection;
}

export interface MapSelectionSet extends ResolvedMapSelectionSet {
  readonly setIds: readonly string[];
}
