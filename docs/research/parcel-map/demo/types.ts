import type {
  LngLat,
  LngLatBounds,
  MultiPolygonGeometry,
  PolygonGeometry
} from '@yandex/ymaps3-types';

export interface DemoParcel {
  readonly cadastralNumber: string;
  readonly codes: readonly string[];
  readonly part: string;
  readonly geometry: PolygonGeometry | MultiPolygonGeometry;
  readonly center: LngLat;
  readonly area?: number;
}

export interface DemoData {
  readonly displayOffset: {
    readonly eastMeters: number;
    readonly northMeters: number;
  };
  readonly parcels: readonly DemoParcel[];
  readonly parts: readonly {
    readonly id: string;
    readonly name: string;
    readonly matched: number;
    readonly total: number;
    readonly bounds: LngLatBounds;
  }[];
  readonly bounds: LngLatBounds;
  readonly matched: number;
  readonly total: number;
}

declare global {
  const __PARCEL_DEMO__: DemoData;
  interface Window {
    ymaps3?: typeof ymaps3;
  }
}
