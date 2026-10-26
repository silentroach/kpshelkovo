import type { LngLatBounds } from '@yandex/ymaps3-types';
import type { Snippet } from 'svelte';

import type { PlaceMapLayer, PlaceMarker, PlaceStatus } from './schema';
import type { PlaceCoordinates, PlaceGeometry, PlaceOpeningHours } from './types';

export interface PlaceMapItem {
  readonly slug: string;
  readonly mapLayer?: PlaceMapLayer;
  readonly name: string;
  readonly marker?: PlaceMarker;
  readonly status: PlaceStatus;
  readonly statusLabel?: string;
  readonly coordinates: PlaceCoordinates;
  readonly geometry?: PlaceGeometry;
  readonly openingHours?: PlaceOpeningHours;
  readonly url: string;
}

export interface PlaceMapFallback {
  readonly name: string;
  readonly url: string;
}

export interface PlaceMapProps {
  readonly dataUrl?: string;
  readonly fallbackPlace?: PlaceMapFallback;
  readonly initialBounds?: LngLatBounds;
  readonly places?: readonly PlaceMapItem[];
  readonly forest?: Snippet;
  readonly village?: Snippet;
  readonly park?: Snippet;
  readonly river?: Snippet;
}
