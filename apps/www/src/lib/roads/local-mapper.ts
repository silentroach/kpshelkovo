import { parse } from 'yaml';

import { RawLocalRoadsSchema, type RawLocalRoads } from './local-raw-schema.ts';
import type { LocalRoad, LocalRoadPoint } from './local-types.ts';

const mapLocalRoads = (roads: RawLocalRoads): readonly LocalRoad[] => {
  const ids = new Set<string>();
  return roads.map(({ id, points }) => {
    if (ids.has(id)) throw new Error(`Duplicate local road ID: ${id}`);
    ids.add(id);
    return {
      id,
      points: points.map((point): LocalRoadPoint =>
        Array.isArray(point)
          ? { kind: 'coordinate', position: point }
          : { kind: 'osm', nodeId: point.osm_node }
      )
    };
  });
};

export const parseLocalRoads = (yaml: string): readonly LocalRoad[] =>
  mapLocalRoads(RawLocalRoadsSchema.parse(parse(yaml)));
