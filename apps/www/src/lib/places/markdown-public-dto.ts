import type { PlaceMapPublicOpeningHoursDto } from './map-public-dto';
import type { PLACE_TIME_ZONE } from './opening-hours';
import type { PlaceCategory, PlaceStatus } from './schema';

export type PlaceMarkdownPublicDto = {
  readonly title: string;
  readonly category: PlaceCategory;
  readonly status: PlaceStatus;
  readonly address?: string;
  readonly coordinates: {
    readonly lat: number;
    readonly lng: number;
  };
  readonly html_url: string;
  readonly map_url: string;
  readonly contact_url?: string;
  readonly index_url: string;
  readonly opening_hours?: PlaceMapPublicOpeningHoursDto & {
    readonly timezone: typeof PLACE_TIME_ZONE;
  };
};
