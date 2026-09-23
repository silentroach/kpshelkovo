import type { LngLatBounds } from '@yandex/ymaps3-types';

import type { ParcelMapPublicDto } from '@/lib/parcels/map-public-schema';

export type ParcelMapItem = ParcelMapPublicDto[number];
export type ParcelMapPayload = ParcelMapPublicDto;

export interface ParcelLayer {
  enable(parcels: readonly ParcelMapItem[]): void;
  disable(): void;
  focus(code: string): boolean;
  updateViewport(zoom: number, bounds: LngLatBounds): void;
  destroy(): void;
}
