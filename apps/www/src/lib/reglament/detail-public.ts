import type { z } from 'zod';

import type {
  controlTotalSchema,
  datasetSchema,
  moneyValueSchema,
  needsCheckSchema,
  quantityValueSchema,
  resourceSchema,
  sourceQuoteItemSchema,
  sourceValueSchema,
  statusInfoSchema,
  workItemSchema,
} from './detail-public-schema';

export type PublicEstimateDetailSourceId = `s${number}`;

type DeepReadonly<T> = T extends readonly unknown[]
  ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
  : T extends object
    ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
    : T;

type PublicEstimateDetailDto<T extends z.ZodType> = DeepReadonly<z.infer<T>>;

export type PublicEstimateDetailQuantityValue = PublicEstimateDetailDto<
  typeof quantityValueSchema
>;
export type PublicEstimateDetailMoneyValue = PublicEstimateDetailDto<
  typeof moneyValueSchema
>;
export type PublicEstimateDetailSourceQuoteItem = PublicEstimateDetailDto<
  typeof sourceQuoteItemSchema
>;
export type PublicEstimateDetailSourceValue = PublicEstimateDetailDto<
  typeof sourceValueSchema
>;
export type PublicEstimateDetailNeedsCheck = PublicEstimateDetailDto<
  typeof needsCheckSchema
>;
export type PublicEstimateDetailStatusInfo = PublicEstimateDetailDto<
  typeof statusInfoSchema
>;
export type PublicEstimateDetailWorkItem = PublicEstimateDetailDto<
  typeof workItemSchema
>;
export type PublicEstimateDetailResource = PublicEstimateDetailDto<
  typeof resourceSchema
>;
export type PublicEstimateDetailControlTotal = PublicEstimateDetailDto<
  typeof controlTotalSchema
>;
export type PublicEstimateDetailDataset = Omit<
  PublicEstimateDetailDto<typeof datasetSchema>,
  'sources'
> & {
  readonly sources: Readonly<
    Record<PublicEstimateDetailSourceId, PublicEstimateDetailSourceValue>
  >;
};
