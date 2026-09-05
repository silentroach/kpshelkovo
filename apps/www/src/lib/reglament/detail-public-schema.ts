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

const textSchema = z.string().min(1);
const sourceIdSchema = z.string().regex(/^s[1-9]\d*$/);
const sourceRefsSchema = z.array(sourceIdSchema).min(1);
const sourceIdsSchema = z
  .array(sourceIdSchema)
  .min(1)
  .refine((sourceIds) => new Set(sourceIds).size === sourceIds.length);

export const quantityValueSchema = z
  .union([
    z.strictObject({
      value: z.number(),
      unit: textSchema,
      note: textSchema.optional(),
    }),
    z.strictObject({
      value: z.null(),
      unit: textSchema.nullable(),
      note: textSchema.optional(),
    }),
  ])
  .meta({ id: 'quantityValue' });

export const moneyValueSchema = z
  .strictObject({
    value: z.number().nullable(),
    note: textSchema.optional(),
  })
  .meta({ id: 'moneyValue' });

export const sourceQuoteItemSchema = z
  .strictObject({
    label: textSchema,
    resource_ids: z.array(textSchema).min(1).optional(),
    quantity: quantityValueSchema.optional(),
    unit_price_rub: moneyValueSchema.optional(),
    total_rub: moneyValueSchema.optional(),
    note: textSchema.optional(),
  })
  .meta({ id: 'sourceQuoteItem' });

const sourceValueShape = {
  pdf: z.enum(ESTIMATE_DETAIL_SOURCE_PDFS),
  page: z.number().int().positive(),
  fragment: textSchema,
  note: textSchema.optional(),
};

export const sourceValueSchema = z
  .union([
    z.strictObject({
      ...sourceValueShape,
      quote: textSchema.optional(),
      quote_items: z.never().optional(),
    }),
    z.strictObject({
      ...sourceValueShape,
      quote: z.never().optional(),
      quote_items: z.array(sourceQuoteItemSchema).min(1),
    }),
  ])
  .meta({ id: 'sourceValue' });

export const needsCheckSchema = z
  .strictObject({
    reason: textSchema,
    source_refs: sourceRefsSchema.optional(),
  })
  .meta({ id: 'needsCheck' });

const verifiedStatusInfoShape = {
  status: z.never().optional(),
  status_label_ru: z.never().optional(),
  needs_check: z.never().optional(),
};
const derivedStatusInfoShape = {
  status: z.literal('derived'),
  status_label_ru: textSchema,
  needs_check: z.never().optional(),
};
const needsCheckStatusInfoShape = {
  status: z.literal('needs_check'),
  status_label_ru: textSchema,
  needs_check: needsCheckSchema,
};

export const statusInfoSchema = z.union([
  z.strictObject(verifiedStatusInfoShape),
  z.strictObject(derivedStatusInfoShape),
  z.strictObject(needsCheckStatusInfoShape),
]);

const withStatusInfo = <Shape extends z.ZodRawShape>(shape: Shape) =>
  z.union([
    z.strictObject({ ...shape, ...verifiedStatusInfoShape }),
    z.strictObject({ ...shape, ...derivedStatusInfoShape }),
    z.strictObject({ ...shape, ...needsCheckStatusInfoShape }),
  ]);

export const workItemSchema = withStatusInfo({
  id: textSchema,
  title: textSchema,
  estimate_row_id: textSchema,
  service_ids: z.array(textSchema).min(1).optional(),
  source_refs: sourceRefsSchema,
  note: textSchema.optional(),
}).meta({ id: 'workItem' });

export const resourceSchema = withStatusInfo({
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
}).meta({ id: 'resource' });

export const controlTotalSchema = withStatusInfo({
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
}).meta({ id: 'controlTotal' });

export const datasetSchema = z
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

export const buildPublicEstimateDetails2026JsonSchema = (
  id: string,
  inputSourceIds: readonly string[],
): Record<string, unknown> => {
  const sourceIds = sourceIdsSchema.parse(inputSourceIds);
  const sourceProperties = Object.fromEntries(
    sourceIds.map((sourceId) => [sourceId, { $ref: '#/$defs/sourceValue' }]),
  );

  return z.toJSONSchema(publicEstimateDetailDatasetSchema, {
    target: 'draft-2020-12',
    override: ({ zodSchema, jsonSchema }) => {
      if (zodSchema === sourceIdSchema) {
        jsonSchema.enum = sourceIds;
      }

      if (zodSchema === publicEstimateDetailDatasetSchema) {
        if (!jsonSchema.properties) {
          throw new Error('Detail dataset JSON Schema has no properties');
        }

        jsonSchema.$id = id;
        jsonSchema.properties.sources = {
          type: 'object',
          properties: sourceProperties,
          required: sourceIds,
          additionalProperties: false,
        };
      }
    },
  });
};
