import type { CollectionEntry } from 'astro:content';

import type { PreprocessedSiteMarkdownBody } from '@/lib/markdown/render';
import type { EntityMentionTarget } from '@/lib/mentions';

import type { RawPlace } from './raw-schema';
import type {
  PlaceCategory,
  PlaceMarker,
  PlaceStatus,
  PlaceWeekday,
} from './schema';

export type PlaceEntry = Pick<CollectionEntry<'places'>, 'id' | 'body'> & {
  readonly data: RawPlace;
};

export interface PlaceCoordinates {
  readonly lat: number;
  readonly lng: number;
}

export type PlaceGeometryPosition = readonly [lng: number, lat: number];
export type PlacePolygonCoordinates =
  readonly (readonly PlaceGeometryPosition[])[];

export type PlacePolygonGeometry =
  | {
      readonly type: 'Polygon';
      readonly coordinates: PlacePolygonCoordinates;
    }
  | {
      readonly type: 'MultiPolygon';
      readonly coordinates: readonly PlacePolygonCoordinates[];
    };

export interface PlaceAreaGeometry {
  readonly precision: 'approximate';
  readonly geometry: PlacePolygonGeometry;
}

export interface PlaceGeometry {
  readonly area: PlaceAreaGeometry;
}

export interface PlaceContact {
  readonly id: string;
  readonly url: string;
}

export interface PlaceOpeningHoursPeriod {
  readonly days: readonly PlaceWeekday[];
  readonly opensAt: string;
  readonly closesAt: string;
}

export interface PlaceOpeningHours {
  readonly description: string;
  readonly periods: readonly PlaceOpeningHoursPeriod[];
}

export interface Place {
  readonly slug: string;
  readonly name: string;
  readonly category: PlaceCategory;
  readonly marker?: PlaceMarker;
  readonly status: PlaceStatus;
  readonly summary: string;
  readonly searchAliases?: readonly string[];
  readonly body: PreprocessedSiteMarkdownBody;
  readonly mentions: readonly EntityMentionTarget[];
  readonly address?: string;
  readonly coordinates: PlaceCoordinates;
  readonly geometry?: PlaceGeometry;
  readonly mapUrl: string;
  readonly openingHours?: PlaceOpeningHours;
  readonly contact?: PlaceContact;
  readonly url: string;
  readonly markdownUrl: string;
  readonly canonical: string;
}

export interface PlacesDataset {
  readonly places: readonly Place[];
  readonly bySlug: ReadonlyMap<string, Place>;
}
