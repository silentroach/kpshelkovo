import type { LngLatBounds } from '@yandex/ymaps3-types';

import type { ParcelMapPublicDto } from '@/lib/parcels/map-public-schema';
import type { ParcelPart } from '@/lib/parcels/schema';

export type ParcelMapItem = ParcelMapPublicDto[number];
export type ParcelMapPayload = ParcelMapPublicDto;
export type ParcelSelectionChange = (item?: ParcelMapItem, source?: HTMLButtonElement) => void;

export interface ParcelLayer {
  enable(part: ParcelPart, parcels: readonly ParcelMapItem[]): void;
  disable(part: ParcelPart, finishSelection?: boolean): void;
  clearSelection(): void;
  focus(code: string): boolean;
  updateViewport(zoom: number, bounds: LngLatBounds): void;
  destroy(): void;
}
