import type { EditorialFeatureCollection } from '@/lib/geometry/editorial-types';

export interface EditorialMapBlock {
  /** One-based order among map blocks in the source document. */
  readonly index: number;
  readonly geometry: EditorialFeatureCollection;
  readonly url?: string;
}
