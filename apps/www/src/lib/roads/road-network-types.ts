import type { EditorialPosition } from '@/lib/geometry/editorial-types';

import type { RoadBounds } from './types.ts';

export type RoadNetworkNodeId = `osm:${number}` | `local:${string}:${number}`;

export type RoadNetworkNode = {
  readonly position: EditorialPosition;
  readonly tags?: Readonly<Record<string, string>>;
};

export type RoadNetworkWay = {
  /** Consecutive nodes form edges. Only a shared node ID joins ways. */
  readonly nodes: readonly RoadNetworkNodeId[];
} & (
  | { readonly source: 'osm'; readonly id: number; readonly tags: Readonly<Record<string, string>> }
  | { readonly source: 'local'; readonly id: string }
);

export type RoadNetwork = {
  readonly bounds: RoadBounds;
  readonly nodes: ReadonlyMap<RoadNetworkNodeId, RoadNetworkNode>;
  readonly ways: readonly RoadNetworkWay[];
};
