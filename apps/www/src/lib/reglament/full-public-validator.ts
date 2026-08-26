import { z } from 'zod';

import type { PublicFullReglamentDataset } from './full-public';

const sourceRefSchema = z
  .object({
    pdf: z.literal('full'),
    page: z.number().int().positive(),
    fragment: z.string(),
    quote: z.string().optional(),
    note: z.string().optional(),
  })
  .strict();

const quantitySchema = z
  .object({
    raw: z.string(),
    value: z.number().nullable(),
    status: z.enum([
      'present',
      'empty_cell',
      'sum_explicit_values',
      'not_summed',
      'group_row',
      'requires_visual_check',
    ]),
  })
  .strict();

const villageSchema = z
  .object({
    id: z.enum([
      'shelkovo-village',
      'shelkovo-forest',
      'shelkovo-park',
      'shelkovo-river',
    ]),
    title: z.string(),
    households_count: z.number().int(),
    land_area_sotka: z.number(),
    land_area_share_percent: z.number(),
    land_area_share_kind: z.literal('calculated_from_pdf'),
    source_refs: z.array(sourceRefSchema),
    verification_note: z.string().nullable(),
  })
  .strict();

const commonAssetSchema = z
  .object({
    id: z.string(),
    category: z.enum([
      'roads',
      'stormwater',
      'greenery',
      'forest',
      'improvement',
      'electricity',
      'security',
    ]),
    title: z.string(),
    unit: z.string().nullable(),
    values_by_village: z
      .object({
        'shelkovo-village': quantitySchema,
        'shelkovo-forest': quantitySchema,
        'shelkovo-park': quantitySchema,
        'shelkovo-river': quantitySchema,
      })
      .strict(),
    total: quantitySchema,
    total_mode: z.enum([
      'sum_explicit_values',
      'not_summed',
      'empty',
      'group_row',
    ]),
    source_refs: z.array(sourceRefSchema),
    verification_note: z.string().nullable(),
  })
  .strict();

const serviceSchema = z
  .object({
    id: z.string(),
    group: z.enum(['year_round', 'winter_period', 'summer_period']),
    title: z.string(),
    frequency_raw: z.string(),
    frequency_note: z.string().nullable(),
    source_refs: z.array(sourceRefSchema),
    quote: z.string().optional(),
  })
  .strict();

const serviceToEstimateMapItemSchema = z
  .object({
    service_id: z.string(),
    status: z.enum(['explicit_found', 'partial', 'not_found', 'needs_check']),
    status_label_ru: z.string(),
    estimate_section_ids: z.array(z.string()),
    estimate_row_ids: z.array(z.string()),
    source_refs: z.array(sourceRefSchema),
    estimate_source_refs: z.array(sourceRefSchema),
    explanation: z.string(),
    verification_note: z.string().nullable(),
  })
  .strict();

const calculationAssumptionSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    summary: z.string(),
    status_label_ru: z.string(),
    why_important: z.string(),
    how_to_verify: z.string(),
    related_fact_ids: z.array(z.string()),
    source_refs: z.array(sourceRefSchema),
    quotes: z.array(z.string()),
  })
  .strict();

const auditNoteSchema = z
  .object({
    id: z.string(),
    category: z.enum([
      'data_quality',
      'estimate_mapping',
      'calculation_check',
      'source_verification',
    ]),
    title: z.string(),
    summary: z.string(),
    public_wording: z.string(),
    severity: z.enum(['info', 'watch', 'needs_check']),
    related_fact_ids: z.array(z.string()),
    source_refs: z.array(sourceRefSchema),
    next_step: z.string(),
  })
  .strict();

const publicFullReglamentDatasetSchema = z
  .object({
    schema_version: z.literal('1'),
    dataset_id: z.literal('full-reglament-2026'),
    title: z.string(),
    source_pdf: z
      .object({
        pdf: z.literal('full'),
        title: z.string(),
        pages_total: z.number().int().positive(),
      })
      .strict(),
    curation_sources: z.array(z.string()),
    tariff_summary: z
      .object({
        tariff_area_sotka: z.number(),
        total_annual_cost_rub: z.number(),
        tariff_rub_per_sotka_month: z.number(),
        source_refs: z.array(sourceRefSchema),
      })
      .strict(),
    villages: z.array(villageSchema),
    common_assets: z.array(commonAssetSchema),
    services: z.array(serviceSchema),
    service_to_estimate_map: z.array(serviceToEstimateMapItemSchema),
    calculation_assumptions: z.array(calculationAssumptionSchema),
    audit_notes: z.array(auditNoteSchema),
  })
  .strict();

export const validatePublicFullReglamentDataset = (
  input: unknown,
): PublicFullReglamentDataset => publicFullReglamentDatasetSchema.parse(input);
