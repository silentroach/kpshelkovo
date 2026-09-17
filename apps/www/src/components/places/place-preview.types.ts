import type { Place } from '@/lib/places/types';

export interface PlacePreviewProps {
  readonly place: Place;
}

export type PlacePreviewData = Pick<Place, 'coordinates' | 'geometry' | 'openingHours'>;
