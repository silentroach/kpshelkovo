import { OSM_LICENSE, OSM_SOURCE, OVERPASS_ENDPOINT } from './osm.ts';
import {
  OverpassErrorSchema,
  OverpassRoadsSchema,
  RawRoadSnapshotSchema,
  RoadCaptureSchema
} from './raw-schema.ts';
import type { RoadBounds, RoadSnapshot, RoadWay } from './types.ts';

const vehicleHighways = new Set([
  'motorway',
  'motorway_link',
  'trunk',
  'trunk_link',
  'primary',
  'primary_link',
  'secondary',
  'secondary_link',
  'tertiary',
  'tertiary_link',
  'unclassified',
  'residential',
  'living_street',
  'service',
  'road'
]);
const explicitMotorAccess = new Set(['yes', 'designated', 'permissive', 'destination', 'private']);

const isRoad = ({ tags }: RoadWay): boolean => {
  const highway = tags.highway;
  if (
    !highway ||
    tags.area === 'yes' ||
    highway === 'construction' ||
    highway === 'proposed' ||
    highway === 'track'
  ) {
    return false;
  }
  const access = tags.motorcar ?? tags.motor_vehicle;
  return vehicleHighways.has(highway) || (!!access && explicitMotorAccess.has(access));
};

const sortedTags = (tags: Readonly<Record<string, string>>) =>
  Object.fromEntries(Object.entries(tags).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));

const normalizeRoadSnapshot = (data: RoadSnapshot): RoadSnapshot => {
  const nodes = new Set(data.nodes.map(({ id }) => id));
  const ways = new Set<number>();
  if (nodes.size !== data.nodes.length) throw new Error('Duplicate OSM node ID');

  for (const way of data.ways) {
    if (!isRoad(way)) throw new Error(`OSM way ${way.id} is not an included road`);
    if (ways.has(way.id)) throw new Error(`Duplicate OSM way ${way.id}`);
    ways.add(way.id);
    for (const nodeId of way.nodes) {
      if (!nodes.has(nodeId))
        throw new Error(`OSM way ${way.id} references missing node ${nodeId}`);
    }
  }

  return {
    source: data.source,
    license: data.license,
    endpoint: data.endpoint,
    capturedAt: data.capturedAt,
    osmTimestamp: data.osmTimestamp,
    bounds: data.bounds,
    nodes: data.nodes
      .toSorted((a, b) => a.id - b.id)
      .map(({ id, lat, lon, tags }) => ({
        id,
        lat,
        lon,
        tags: tags ? sortedTags(tags) : undefined
      })),
    ways: data.ways
      .toSorted((a, b) => a.id - b.id)
      .map(({ id, nodes, tags }) => ({
        id,
        nodes,
        tags: sortedTags(tags)
      }))
  };
};

export const mapRoadSnapshot = (input: unknown): RoadSnapshot => {
  const data = RawRoadSnapshotSchema.parse(input);
  const nodeTags = new Map(Object.entries(data.nodeTags));
  const nodes = data.nodes.map(([id, lat, lon]) => {
    const key = String(id);
    const tags = nodeTags.get(key);
    nodeTags.delete(key);
    return { id, lat, lon, tags };
  });
  const { value: unmatched } = nodeTags.keys().next();
  if (unmatched !== undefined) throw new Error(`OSM node tags reference missing node ${unmatched}`);
  return normalizeRoadSnapshot({
    source: data.source,
    license: data.license,
    endpoint: data.endpoint,
    capturedAt: data.capturedAt,
    osmTimestamp: data.osmTimestamp,
    bounds: data.bounds,
    nodes,
    ways: data.ways
  });
};

export const mapOverpassRoads = (
  input: unknown,
  bounds: RoadBounds,
  capturedAt: string
): RoadSnapshot => {
  const status = OverpassErrorSchema.safeParse(input);
  if (status.success && status.data.remark) throw new Error(`Overpass: ${status.data.remark}`);
  const { elements, osm3s } = OverpassRoadsSchema.parse(input);
  const ways = elements.filter((element) => element.type === 'way').filter(isRoad);
  if (!ways.length) throw new Error('Overpass returned no motor roads');
  const referenced = new Set(ways.flatMap((way) => way.nodes));
  const capture = RoadCaptureSchema.parse({ capturedAt, bounds });
  const nodes = elements
    .filter((element) => element.type === 'node')
    .filter(({ id }) => referenced.has(id));
  return normalizeRoadSnapshot({
    source: OSM_SOURCE,
    license: OSM_LICENSE,
    endpoint: OVERPASS_ENDPOINT,
    capturedAt: capture.capturedAt,
    osmTimestamp: osm3s.timestamp_osm_base,
    bounds: capture.bounds,
    nodes,
    ways
  });
};
