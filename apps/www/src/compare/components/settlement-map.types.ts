import type { YMapLocationRequest, YMapMarker } from '@yandex/ymaps3-types';

export interface SettlementMapData {
  readonly slug: string;
  readonly name: string;
  readonly shortName: string;
  readonly lat: number;
  readonly lng: number;
  readonly normalizedTariff: number;
  readonly isBaseline: boolean;
  readonly tariffText?: string;
  readonly tariffHint?: string;
  readonly companyText?: string;
}

export interface SettlementMapProps {
  readonly settlements: readonly SettlementMapData[];
  readonly height?: number;
  readonly startFromMoscow?: boolean;
  readonly fitRevision?: number;
}

export interface MarkerLike {
  readonly slug: string;
  readonly marker: YMapMarker;
  readonly el: HTMLElement;
}

export interface Range {
  readonly min: number;
  readonly max: number;
}

export interface Tip {
  readonly item: SettlementMapData;
  readonly x: number;
  readonly y: number;
  readonly up: boolean;
}

export interface MapView {
  readonly location: YMapLocationRequest;
  readonly margin: [number, number, number, number];
}
