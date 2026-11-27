import { z } from 'zod';

import { OSM_LICENSE, OSM_SOURCE, OVERPASS_ENDPOINT } from './osm.ts';

const id = z.int().positive();
const lat = z.number().min(-90).max(90);
const lon = z.number().min(-180).max(180);
const tags = z.record(z.string(), z.string());
const timestamp = z.iso.datetime();
const way = z.object({ id, nodes: z.array(id).min(2), tags });

export const RoadCaptureSchema = z.object({
  capturedAt: timestamp,
  bounds: z
    .tuple([lat, lon, lat, lon])
    .refine(([south, west, north, east]) => south < north && west < east, 'Invalid road bounds')
});

export const RawRoadSnapshotSchema = RoadCaptureSchema.extend({
  source: z.literal(OSM_SOURCE),
  license: z.literal(OSM_LICENSE),
  endpoint: z.literal(OVERPASS_ENDPOINT),
  osmTimestamp: timestamp,
  nodes: z.array(z.tuple([id, lat, lon])).min(1),
  nodeTags: z.record(z.string(), tags),
  ways: z.array(way).min(1)
});

export type RawRoadSnapshot = z.output<typeof RawRoadSnapshotSchema>;

export const OverpassRoadsSchema = z.object({
  osm3s: z.object({ timestamp_osm_base: timestamp }),
  elements: z.array(
    z.discriminatedUnion('type', [
      z.object({ type: z.literal('node'), id, lat, lon, tags: tags.optional() }),
      way.extend({ type: z.literal('way') })
    ])
  )
});

export const OverpassErrorSchema = z.object({ remark: z.string().optional() });
