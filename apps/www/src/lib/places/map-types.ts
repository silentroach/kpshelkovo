import type { PlaceMarker, PlaceStatus } from './schema';
import type {
  PlaceCoordinates,
  PlaceGeometry,
  PlaceOpeningHours,
} from './types';

export interface PlaceMapItem {
  readonly slug: string;
  readonly name: string;
  readonly marker?: PlaceMarker;
  readonly status: PlaceStatus;
  readonly coordinates: PlaceCoordinates;
  readonly geometry?: PlaceGeometry;
  readonly openingHours?: PlaceOpeningHours;
  readonly url: string;
}
