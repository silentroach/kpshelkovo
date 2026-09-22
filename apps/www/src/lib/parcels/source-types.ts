import type { ParcelPart } from './schema';
import type {
  GenplanSnapshot,
  NspdMetadata,
  ParcelMatches,
  RawNspdFeature
} from './source-schemas';

export interface NspdSnapshot {
  readonly metadata: NspdMetadata;
  /** Исходные координаты EPSG:3857; конвертация нужна только при создании записи. */
  readonly features: readonly RawNspdFeature[];
}

export type GenplanSnapshots = ReadonlyMap<ParcelPart, GenplanSnapshot>;
export type ConfirmedMatches = ParcelMatches['matches'];
