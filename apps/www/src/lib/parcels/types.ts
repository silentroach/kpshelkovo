import type { CollectionEntry } from 'astro:content';

import type { RawParcel } from './raw-schema';
import type { ParcelFeature, ParcelPart, ParcelStatus } from './schema';

export type ParcelEntry = Pick<CollectionEntry<'parcels'>, 'id' | 'body'> & {
  readonly data: RawParcel;
};

export type ParcelPosition = readonly [longitude: number, latitude: number];
export type ParcelPolygon = readonly (readonly ParcelPosition[])[];

export type ParcelGeometry =
  | { readonly type: 'Polygon'; readonly coordinates: ParcelPolygon }
  | { readonly type: 'MultiPolygon'; readonly coordinates: readonly ParcelPolygon[] };

export interface ParcelPriceObservation {
  /** Московская календарная дата наблюдения предложения, не дата продажи. */
  readonly on: string;
  /** Полная цена предложения в рублях. */
  readonly price: number;
}

export interface ParcelCadastralPart {
  readonly cadastralNumber: string;
  readonly geometry: ParcelGeometry;
  readonly areaM2?: number;
}

export interface Parcel {
  readonly code: string;
  readonly aliases: readonly string[];
  readonly part: ParcelPart;
  readonly cadastralParts: readonly ParcelCadastralPart[];
  readonly areaM2?: number;
  readonly status?: ParcelStatus;
  readonly features: readonly ParcelFeature[];
  readonly priceHistory: readonly ParcelPriceObservation[];
  /** Исходное редакционное Markdown-тело, не предназначенное для рендера слоя. */
  readonly body: string;
}

export interface ParcelsDataset {
  readonly parcels: readonly Parcel[];
  readonly byCode: ReadonlyMap<string, Parcel>;
  readonly byCadastralNumber: ReadonlyMap<string, Parcel>;
}
