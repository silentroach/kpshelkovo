import type { EditorialPosition } from '@/lib/geometry/editorial-types';

export type LocalRoadPoint =
  | { readonly kind: 'osm'; readonly nodeId: number }
  | { readonly kind: 'coordinate'; readonly position: EditorialPosition };

export type LocalRoad = {
  readonly id: string;
  readonly points: readonly LocalRoadPoint[];
};
