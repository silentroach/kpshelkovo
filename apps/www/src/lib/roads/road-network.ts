import type { LocalRoad } from './local-types.ts';
import type {
  RoadNetwork,
  RoadNetworkNode,
  RoadNetworkNodeId,
  RoadNetworkWay
} from './road-network-types.ts';
import type { RoadSnapshot } from './types.ts';

const osmNodeId = (id: number): RoadNetworkNodeId => `osm:${id}`;

export const buildRoadNetwork = (
  snapshot: RoadSnapshot,
  localRoads: readonly LocalRoad[]
): RoadNetwork => {
  const nodes = new Map<RoadNetworkNodeId, RoadNetworkNode>(
    snapshot.nodes.map(({ id, lon, lat, tags }) => [osmNodeId(id), { position: [lon, lat], tags }])
  );
  const ways = snapshot.ways.map(({ id, nodes, tags }): RoadNetworkWay => ({
    source: 'osm',
    id,
    nodes: nodes.map(osmNodeId),
    tags
  }));

  for (const road of localRoads) {
    const refs = road.points.map((point, index): RoadNetworkNodeId => {
      switch (point.kind) {
        case 'osm': {
          const ref = osmNodeId(point.nodeId);
          if (!nodes.has(ref)) {
            throw new Error(`Local road ${road.id} references missing OSM node ${point.nodeId}`);
          }
          return ref;
        }
        case 'coordinate': {
          const ref = `local:${road.id}:${index}` as const;
          nodes.set(ref, { position: point.position });
          return ref;
        }
        default: {
          const unhandled: never = point;
          return unhandled;
        }
      }
    });
    ways.push({ source: 'local', id: road.id, nodes: refs });
  }

  return { bounds: snapshot.bounds, nodes, ways };
};
