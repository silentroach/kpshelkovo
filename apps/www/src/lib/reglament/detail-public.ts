import { z } from 'zod';

import {
  ESTIMATE_DETAIL_CONTROL_SOURCES,
  ESTIMATE_DETAIL_COST_BUCKETS,
  ESTIMATE_DETAIL_RESOURCE_KINDS,
  ESTIMATE_DETAIL_SOURCE_PDFS,
} from './detail-schema';

export const ESTIMATE_DETAILS_2026_PUBLIC_SCHEMA_VERSION = '2' as const;
export const ESTIMATE_DETAILS_2026_PUBLIC_SCHEMA_NAME =
  'EstimateDetails2026Payload';

export type PublicEstimateDetailSourceId = `s${number}`;

type DeepReadonly<T> = T extends readonly unknown[]
  ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
  : T extends object
    ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
    : T;

type PublicEstimateDetailDto<T extends z.ZodType> = DeepReadonly<z.infer<T>>;

const textSchema = z.string().min(1);
const sourceIdSchema = z.string().regex(/^s[1-9]\d*$/);
const sourceRefsSchema = z.array(sourceIdSchema).min(1);

const quantityValueSchema = z
  .strictObject({
    value: z.number().nullable(),
    unit: textSchema.nullable(),
    note: textSchema.optional(),
  })
  .meta({ id: 'quantityValue' });

const moneyValueSchema = z
  .strictObject({
    value: z.number().nullable(),
    note: textSchema.optional(),
  })
  .meta({ id: 'moneyValue' });

const sourceQuoteItemSchema = z
  .strictObject({
    label: textSchema,
    resource_ids: z.array(textSchema).min(1).optional(),
    quantity: quantityValueSchema.optional(),
    unit_price_rub: moneyValueSchema.optional(),
    total_rub: moneyValueSchema.optional(),
    note: textSchema.optional(),
  })
  .meta({ id: 'sourceQuoteItem' });

const sourceValueSchema = z
  .strictObject({
    pdf: z.enum(ESTIMATE_DETAIL_SOURCE_PDFS),
    page: z.number().int().positive(),
    fragment: textSchema,
    quote: textSchema.optional(),
    quote_items: z.array(sourceQuoteItemSchema).min(1).optional(),
    note: textSchema.optional(),
  })
  .meta({ id: 'sourceValue' });

const needsCheckSchema = z
  .strictObject({
    reason: textSchema,
    source_refs: sourceRefsSchema.optional(),
  })
  .meta({ id: 'needsCheck' });

const statusInfoSchema = z.strictObject({
  status: z.enum(['derived', 'needs_check']).optional(),
  status_label_ru: textSchema.optional(),
  needs_check: needsCheckSchema.optional(),
});

const workItemSchema = z
  .strictObject({
    id: textSchema,
    title: textSchema,
    estimate_row_id: textSchema,
    service_ids: z.array(textSchema).min(1).optional(),
    source_refs: sourceRefsSchema,
    note: textSchema.optional(),
    ...statusInfoSchema.shape,
  })
  .meta({ id: 'workItem' });

const resourceSchema = z
  .strictObject({
    id: textSchema,
    work_item_id: textSchema,
    estimate_row_id: textSchema,
    kind: z.enum(ESTIMATE_DETAIL_RESOURCE_KINDS),
    title: textSchema,
    cost_bucket: z.enum(ESTIMATE_DETAIL_COST_BUCKETS),
    quantity: quantityValueSchema.optional(),
    unit_price_rub: moneyValueSchema.optional(),
    total_rub: moneyValueSchema,
    source_refs: sourceRefsSchema,
    note: textSchema.optional(),
    ...statusInfoSchema.shape,
  })
  .meta({ id: 'resource' });

const controlTotalSchema = z
  .strictObject({
    id: textSchema,
    estimate_row_id: textSchema,
    control_source: z.enum(ESTIMATE_DETAIL_CONTROL_SOURCES),
    cost_bucket: z.enum(ESTIMATE_DETAIL_COST_BUCKETS),
    source_total_rub: moneyValueSchema,
    detail_total_rub: moneyValueSchema.optional(),
    aggregate_total_rub: moneyValueSchema.optional(),
    delta_rub: z.number().optional(),
    tolerance_rub: z.number().min(0).optional(),
    resource_ids: z.array(textSchema).min(1).optional(),
    source_refs: sourceRefsSchema,
    note: textSchema.optional(),
    ...statusInfoSchema.shape,
  })
  .meta({ id: 'controlTotal' });

const datasetSchema = z
  .strictObject({
    schema_version: z.literal(ESTIMATE_DETAILS_2026_PUBLIC_SCHEMA_VERSION),
    dataset_id: z.literal('estimate-details-2026'),
    title: textSchema,
    year: z.literal(2026),
    source_pdfs: z
      .array(
        z
          .strictObject({
            pdf: z.enum(ESTIMATE_DETAIL_SOURCE_PDFS),
            title: textSchema,
            pages_total: z.number().int().positive().optional(),
          })
          .meta({ id: 'sourcePdf' }),
      )
      .min(1),
    sources: z.record(sourceIdSchema, sourceValueSchema),
    curation_notes: z.array(textSchema),
    work_items: z.array(workItemSchema),
    resources: z.array(resourceSchema),
    control_totals: z.array(controlTotalSchema),
  })
  .superRefine((dataset, context) => {
    const facts = [
      ...dataset.work_items,
      ...dataset.resources,
      ...dataset.control_totals,
    ];
    const sourceRefs = facts.flatMap((fact) => [
      ...fact.source_refs,
      ...(fact.needs_check?.source_refs ?? []),
    ]);

    for (const sourceId of sourceRefs) {
      if (!dataset.sources[sourceId]) {
        context.addIssue({
          code: 'custom',
          message: `Unknown source reference: ${sourceId}`,
          path: ['sources'],
        });
      }
    }
  })
  .meta({
    title: ESTIMATE_DETAILS_2026_PUBLIC_SCHEMA_NAME,
    description:
      'Детальная смета регламента 2026: работы, ресурсы, контрольные итоги и ссылки на фрагменты исходных PDF.',
  });

export const publicEstimateDetailDatasetSchema = datasetSchema;

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

export const buildPublicEstimateDetails2026JsonSchema = (
  id: string,
): Record<string, unknown> =>
  z.toJSONSchema(publicEstimateDetailDatasetSchema, {
    target: 'draft-2020-12',
    override: ({ zodSchema, jsonSchema }) => {
      if (zodSchema === publicEstimateDetailDatasetSchema) {
        jsonSchema.$id = id;
      }
    },
  });
