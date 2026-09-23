import type { EditorialPublicGeometry } from '@/lib/geometry/editorial-public-schema';

import type { PlaceMarker, PlaceStatus, PlaceWeekday } from './schema';

export interface PlaceMapPublicOpeningHoursPeriodDto {
  readonly days: readonly PlaceWeekday[];
  readonly opens_at: string;
  readonly closes_at: string;
}

export interface PlaceMapPublicOpeningHoursDto {
  readonly description?: string;
  readonly periods: readonly PlaceMapPublicOpeningHoursPeriodDto[];
}

export interface PlaceMapPublicItemDto {
  readonly slug: string;
  readonly name: string;
  readonly marker?: PlaceMarker;
  readonly status: PlaceStatus;
  readonly coordinates: {
    readonly lat: number;
    readonly lng: number;
  };
  readonly geometry?: EditorialPublicGeometry;
  readonly opening_hours?: PlaceMapPublicOpeningHoursDto;
  readonly html_url: string;
}

export interface PlaceMapPublicPayloadDto {
  readonly places: readonly PlaceMapPublicItemDto[];
}
