import type { PlaceCoordinates } from '@/lib/places/types';

export interface MapCardShellProps {
  readonly coordinates?: PlaceCoordinates;
  readonly mapUrl?: string;
}
