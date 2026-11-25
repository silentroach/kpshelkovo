import { z } from 'zod';

import source from '@/data/territory/shelkovo.geojson?raw';
import { RawPolygonGeometrySchema } from '@/lib/geometry/raw-polygon-schema';

const feature = z.object({
  type: z.literal('Feature'),
  properties: z.object({ approvedOn: z.iso.date(), source: z.url() }),
  geometry: RawPolygonGeometrySchema.options[0]
});

export const shelkovoBoundary = feature.parse(JSON.parse(source)).geometry.coordinates;
