import { z } from 'zod';

import { OSM_LICENSE, OSM_SOURCE, OVERPASS_ENDPOINT } from './osm.ts';

const id = z.int().positive();
const lat = z.number().min(-90).max(90);
const lon = z.number().min(-180).max(180);
const tags = z.record(z.string(), z.string());
const timestamp = z.iso.datetime();
const node = z.object({ id, lat, lon, tags: tags.optional() });
const way = z.object({ id, nodes: z.array(id).min(2), tags });

export const RawRoadSnapshotSchema = z.object({
  source: z.literal(OSM_SOURCE),
  license: z.literal(OSM_LICENSE),
  endpoint: z.literal(OVERPASS_ENDPOINT),
  capturedAt: timestamp,
  osmTimestamp: timestamp,
  bounds: z
    .tuple([lat, lon, lat, lon])
    .refine(([south, west, north, east]) => south < north && west < east, 'Invalid road bounds'),
  nodes: z.array(node).min(1),
  ways: z.array(way).min(1)
});

export const OverpassRoadsSchema = z.object({
  osm3s: z.object({ timestamp_osm_base: timestamp }),
  elements: z.array(
    z.discriminatedUnion('type', [
      node.extend({ type: z.literal('node') }),
      way.extend({ type: z.literal('way') })
    ])
  )
});

export const OverpassErrorSchema = z.object({ remark: z.string().optional() });
