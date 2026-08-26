import type { PlaceMarker, PlaceStatus, PlaceWeekday } from './schema';

export type PlaceMapPublicPositionDto = readonly [lng: number, lat: number];

export type PlaceMapPublicPolygonCoordinatesDto =
  readonly (readonly PlaceMapPublicPositionDto[])[];

export type PlaceMapPublicPolygonGeometryDto =
  | {
      readonly type: 'Polygon';
      readonly coordinates: PlaceMapPublicPolygonCoordinatesDto;
    }
  | {
      readonly type: 'MultiPolygon';
      readonly coordinates: readonly PlaceMapPublicPolygonCoordinatesDto[];
    };

export interface PlaceMapPublicGeometryDto {
  readonly area: {
    readonly precision: 'approximate';
    readonly geometry: PlaceMapPublicPolygonGeometryDto;
  };
}

export interface PlaceMapPublicOpeningHoursPeriodDto {
  readonly days: readonly PlaceWeekday[];
  readonly opens_at: string;
  readonly closes_at: string;
}

export interface PlaceMapPublicOpeningHoursDto {
  readonly description: string;
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
  readonly geometry?: PlaceMapPublicGeometryDto;
  readonly opening_hours?: PlaceMapPublicOpeningHoursDto;
  readonly html_url: string;
}

export interface PlaceMapPublicPayloadDto {
  readonly places: readonly PlaceMapPublicItemDto[];
}
