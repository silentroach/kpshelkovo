import type { YMapProps } from '@yandex/ymaps3-types';

import type { EditorialFeatureCollection } from '@/lib/geometry/editorial-types';
import type { PlaceCoordinates, PlaceOpeningHours } from '@/lib/places/types';

export interface MapPreviewData {
  readonly coordinates: PlaceCoordinates;
  readonly geometry?: EditorialFeatureCollection;
  readonly openingHours?: PlaceOpeningHours;
  readonly zoom?: number;
  readonly interactive?: boolean;
  /** Canonical point's position as fractions of the container's width and height. */
  readonly anchor?: readonly [number, number];
  readonly muted?: boolean;
  readonly distributionPosition?: YMapProps['distributionPosition'];
  readonly copyrightsPosition?: YMapProps['copyrightsPosition'];
}

export interface MapPreviewProps {
  readonly preview: MapPreviewData;
  readonly label: string;
  readonly class?: string;
}
