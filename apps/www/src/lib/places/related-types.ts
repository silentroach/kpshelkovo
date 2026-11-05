import type { StatusIncident, StatusIncidentState } from '@/lib/status/types';

import type { PlaceMentionRef } from './types';

export interface PlaceStatusMaterial {
  readonly ref: PlaceMentionRef;
  readonly incident: StatusIncident;
}

export interface PlaceRelatedMaterial {
  readonly ref: PlaceMentionRef;
  readonly incident?: StatusIncident;
}

export interface PlaceRelatedMaterials {
  readonly priority: readonly PlaceStatusMaterial[];
  readonly knowledge: readonly PlaceMentionRef[];
  readonly history: readonly PlaceRelatedMaterial[];
}

export interface PlaceStatusContext {
  readonly state: StatusIncidentState;
  readonly period: string;
}
