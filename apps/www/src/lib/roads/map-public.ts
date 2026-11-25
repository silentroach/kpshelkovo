import { createDisplayOffset, createLineClipper } from '@shelkovo/geo';
import { parse } from 'yaml';
import { z } from 'zod';

import displayConfig from '@/config/road-map.yaml?raw';
import { roundPosition } from '@/lib/geometry/coordinate-precision';
import type {
  EditorialPolygonCoordinates,
  EditorialPosition
} from '@/lib/geometry/editorial-types';

import { RoadMapPublicSchema, type RoadMapPublicDto } from './map-public-schema';
import type { RoadSnapshot } from './types';

const offset = z
  .object({ offset_east_m: z.number(), offset_north_m: z.number() })
  .strict()
  .parse(parse(displayConfig));

export const buildRoadMapPayload = (
  snapshot: RoadSnapshot,
  boundary: EditorialPolygonCoordinates,
  config = offset
): RoadMapPublicDto => {
  const [south, , north] = snapshot.bounds;
  const shift = createDisplayOffset(
    config.offset_east_m,
    config.offset_north_m,
    (south + north) / 2
  );
  const positions = new Map<number, EditorialPosition>(
    snapshot.nodes.map(({ id, lon, lat }) => [id, [lon, lat]])
  );
  const clip = createLineClipper(boundary);
  return RoadMapPublicSchema.parse({
    lines: snapshot.ways
      .flatMap((way) => {
        const line = way.nodes.map((id) => {
          const position = positions.get(id);
          if (!position) throw new Error(`OSM way ${way.id} references missing node ${id}`);
          return position;
        });
        return clip(line).map((fragment) => fragment.map((point) => roundPosition(shift(point))));
      })
      .filter((line) => line.some(([x, y]) => x !== line[0]![0] || y !== line[0]![1]))
  });
};
