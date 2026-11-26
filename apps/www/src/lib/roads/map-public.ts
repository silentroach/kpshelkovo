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
import type { RoadNetwork } from './road-network-types';
import { createRoadSurfaceSplitter } from './road-surfaces';

const offset = z
  .object({ offset_east_m: z.number(), offset_north_m: z.number() })
  .strict()
  .parse(parse(displayConfig));

export const buildRoadMapPayload = (
  network: RoadNetwork,
  boundary: EditorialPolygonCoordinates,
  asphaltAreas: string,
  config = offset
): RoadMapPublicDto => {
  const [south, , north] = network.bounds;
  const shift = createDisplayOffset(
    config.offset_east_m,
    config.offset_north_m,
    (south + north) / 2
  );
  const clip = createLineClipper(boundary);
  const split = createRoadSurfaceSplitter(asphaltAreas);
  const lines: Record<'asphalt' | 'gravel', EditorialPosition[][]> = { asphalt: [], gravel: [] };
  for (const way of network.ways) {
    const line = way.nodes.map((id) => {
      const node = network.nodes.get(id);
      if (!node) throw new Error(`Road ${way.source}:${way.id} references missing node ${id}`);
      return node.position;
    });
    for (const { surface, line: fragment } of clip(line).flatMap(split)) {
      const shifted = fragment.map((point) => roundPosition(shift(point)));
      if (shifted.some(([x, y]) => x !== shifted[0]![0] || y !== shifted[0]![1])) {
        lines[surface].push(shifted);
      }
    }
  }
  return RoadMapPublicSchema.parse(lines);
};
