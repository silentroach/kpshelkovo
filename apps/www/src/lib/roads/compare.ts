import type { RoadSnapshot } from './types.ts';

const describeRoads = (snapshot?: RoadSnapshot): ReadonlyMap<number, string> => {
  if (!snapshot) return new Map();
  const nodes = new Map(snapshot.nodes.map((node) => [node.id, node]));
  return new Map(
    snapshot.ways.map((way) => [
      way.id,
      JSON.stringify([way.tags, way.nodes.map((nodeId) => nodes.get(nodeId))])
    ])
  );
};

export const compareRoadSnapshots = (next: RoadSnapshot, previous?: RoadSnapshot) => {
  const before = describeRoads(previous);
  const after = describeRoads(next);
  return {
    added: [...after.keys()].filter((id) => !before.has(id)),
    removed: [...before.keys()].filter((id) => !after.has(id)),
    changed: [...after.keys()].filter((id) => before.has(id) && before.get(id) !== after.get(id))
  };
};
