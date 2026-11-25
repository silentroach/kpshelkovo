import { createDisplayOffset } from '@shelkovo/geo';
import { parse } from 'yaml';
import { z } from 'zod';

import displayConfig from '@/config/road-map.yaml?raw';
import { roundPosition } from '@/lib/geometry/coordinate-precision';

import { RoadMapPublicSchema, type RoadMapPublicDto } from './map-public-schema';
import type { RoadSnapshot } from './types';

const offset = z
  .object({ offset_east_m: z.number(), offset_north_m: z.number() })
  .strict()
  .parse(parse(displayConfig));

export const buildRoadMapPayload = (snapshot: RoadSnapshot, config = offset): RoadMapPublicDto => {
  const [south, , north] = snapshot.bounds;
  const shift = createDisplayOffset(
    config.offset_east_m,
    config.offset_north_m,
    (south + north) / 2
  );
  const positions = new Map(
    snapshot.nodes.map(({ id, lon, lat }) => [id, roundPosition(shift([lon, lat]))])
  );
  return RoadMapPublicSchema.parse({
    source: snapshot.source,
    license: snapshot.license,
    lines: snapshot.ways.map((way) =>
      way.nodes.map((id) => {
        const position = positions.get(id);
        if (!position) throw new Error(`OSM way ${way.id} references missing node ${id}`);
        return position;
      })
    )
  });
};
