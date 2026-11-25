import type { RawRoadSnapshot } from './raw-schema.ts';
import type { RoadSnapshot } from './types.ts';

export const serializeRoadSnapshot = (snapshot: RoadSnapshot): string => {
  const nodeTags: RawRoadSnapshot['nodeTags'] = {};
  const nodes = snapshot.nodes.map<RawRoadSnapshot['nodes'][number]>(({ id, lat, lon, tags }) => {
    if (tags) nodeTags[id] = tags;
    return [id, lat, lon];
  });
  const data = {
    source: snapshot.source,
    license: snapshot.license,
    endpoint: snapshot.endpoint,
    capturedAt: snapshot.capturedAt,
    osmTimestamp: snapshot.osmTimestamp,
    bounds: snapshot.bounds,
    nodes,
    nodeTags,
    ways: snapshot.ways
  };
  return `${JSON.stringify(data, undefined, 2)}\n`;
};
