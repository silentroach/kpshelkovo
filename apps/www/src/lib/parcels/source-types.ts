import type { ParcelFeature, ParcelPart, ParcelStatus } from './schema';
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

export interface MappedGenplanPlot {
  readonly code: string;
  readonly sourceId: string;
  readonly cadastralReference?: string;
  readonly status: ParcelStatus;
  readonly features: readonly ParcelFeature[];
  /** Полная стоимость предложения в рублях, если она положительна. */
  readonly priceRub?: number;
}

export interface MappedGenplanSnapshot {
  readonly part: ParcelPart;
  readonly page: string;
  readonly capturedAt: string;
  readonly observedOn: string;
  readonly plots: readonly MappedGenplanPlot[];
}
