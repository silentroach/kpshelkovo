import type { EstimateDetailDataset } from './detail-schema';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object';

const hasOwn = (value: unknown, key: string): boolean =>
  isRecord(value) && Object.prototype.hasOwnProperty.call(value, key);

const publicEstimateDetailsReplacer = function (
  this: unknown,
  key: string,
  value: unknown,
): unknown {
  if (key === 'quote' && hasOwn(this, 'quote_items')) return undefined;

  if (
    (key === 'status' || key === 'status_label_ru') &&
    isRecord(this) &&
    this.status === 'verified'
  ) {
    return undefined;
  }

  return value;
};

export const buildPublicEstimateDetails2026Json = (
  dataset: EstimateDetailDataset,
): string => JSON.stringify(dataset, publicEstimateDetailsReplacer);
