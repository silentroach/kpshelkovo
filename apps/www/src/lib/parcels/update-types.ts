import type { RawParcel } from './raw-schema.ts';
import type { RawNspdFeature, ParcelMatches } from './source-schemas.ts';
import type { MappedGenplanPlot, MappedGenplanSnapshot } from './source-types.ts';

export interface ParcelCandidate {
  readonly cadastralNumber: string;
  readonly feature: RawNspdFeature;
  readonly plots: readonly MappedGenplanPlot[];
  readonly match?: ParcelMatches['matches'][number];
}

export interface ParcelResolution {
  readonly candidates: readonly ParcelCandidate[];
  readonly unresolved: readonly string[];
  readonly conflicts: readonly string[];
}

export interface SavedParcel {
  readonly path: string;
  readonly data: RawParcel;
  readonly body: string;
}

export interface ParcelChange {
  readonly path: string;
  readonly data: RawParcel;
  readonly body: string;
}

export interface ParcelUpdate {
  readonly records: readonly ParcelChange[];
  readonly added: readonly string[];
  readonly deleted: readonly string[];
  readonly renamed: readonly string[];
  readonly geometryChanged: readonly string[];
  readonly detailsChanged: readonly string[];
  readonly unresolved: readonly string[];
  readonly conflicts: readonly string[];
  readonly genplans: readonly MappedGenplanSnapshot[];
}
