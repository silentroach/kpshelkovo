import type { Place } from '@/lib/places/types';

export interface PlaceDemoProps {
  readonly place: Place;
}

export type PlacePreviewData = Pick<Place, 'coordinates' | 'geometry'>;
