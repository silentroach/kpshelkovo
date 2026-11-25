import { OSM_LICENSE, OSM_SOURCE, OVERPASS_ENDPOINT } from './osm.ts';
import { OverpassErrorSchema, OverpassRoadsSchema, RawRoadSnapshotSchema } from './raw-schema.ts';
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

export const mapRoadSnapshot = (input: unknown): RoadSnapshot => {
  const data = RawRoadSnapshotSchema.parse(input);
  const nodes = new Map(data.nodes.map((node) => [node.id, node]));
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
      .sort((a, b) => a.id - b.id)
      .map(({ id, lat, lon, tags }) => ({
        id,
        lat,
        lon,
        tags: tags ? sortedTags(tags) : undefined
      })),
    ways: data.ways
      .sort((a, b) => a.id - b.id)
      .map(({ id, nodes, tags }) => ({
        id,
        nodes,
        tags: sortedTags(tags)
      }))
  };
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
  return mapRoadSnapshot({
    source: OSM_SOURCE,
    license: OSM_LICENSE,
    endpoint: OVERPASS_ENDPOINT,
    capturedAt,
    osmTimestamp: osm3s.timestamp_osm_base,
    bounds,
    nodes: elements.filter((element) => element.type === 'node' && referenced.has(element.id)),
    ways
  });
};
