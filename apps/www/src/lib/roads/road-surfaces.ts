import { createLineSplitter } from '@shelkovo/geo';

import type { EditorialPosition } from '@/lib/geometry/editorial-types';

import { readAsphaltAreas } from './asphalt-areas';
import type { RoadSurfaceFragment } from './road-surfaces-types';

/** Classify already-clipped roads before applying display offsets and rounding. */
export const createRoadSurfaceSplitter = (yaml: string) => {
  const split = createLineSplitter(readAsphaltAreas(yaml).map((ring) => [ring]));
  return (line: readonly EditorialPosition[]): readonly RoadSurfaceFragment[] =>
    split(line).map(({ inside, line: fragment }) => ({
      surface: inside ? 'asphalt' : 'gravel',
      line: fragment
    }));
};
