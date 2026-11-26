import type { EditorialPosition } from '@/lib/geometry/editorial-types';

/** Independent outer rings, each representing a single asphalt area. */
export type AsphaltAreas = readonly (readonly EditorialPosition[])[];

export type RoadSurfaceFragment = {
  readonly surface: 'asphalt' | 'gravel';
  readonly line: readonly EditorialPosition[];
};
