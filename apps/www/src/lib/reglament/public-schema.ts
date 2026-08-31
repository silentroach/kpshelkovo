import { z } from 'zod';

import {
  EDITABLE_FIELD_KEYS,
  EDITABLE_FIELD_LEVELS,
  ESTIMATE_COEFFICIENT_POLICIES,
  ESTIMATE_ROW_KINDS,
  ESTIMATE_SOURCE_PDFS,
} from './schema';

type DeepReadonly<T> = T extends readonly unknown[]
  ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
  : T extends object
    ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
    : T;

type ReglamentPublicDto<T extends z.ZodType> = DeepReadonly<z.infer<T>>;

// z.int() would add a safe-integer maximum absent from the public contract.
const integer = (minimum = 0) =>
  z.number().min(minimum).refine(Number.isInteger).meta({ type: 'integer' });

const sourcePdfKeySchema = z
  .enum(ESTIMATE_SOURCE_PDFS)
  .meta({ id: 'sourcePdfKey' });
const rowKindSchema = z.enum(ESTIMATE_ROW_KINDS).meta({ id: 'rowKind' });
const coefficientPolicySchema = z
  .enum(ESTIMATE_COEFFICIENT_POLICIES)
  .meta({ id: 'coefficientPolicy' });
const editableFieldKeySchema = z
  .enum(EDITABLE_FIELD_KEYS)
  .meta({ id: 'editableFieldKey' });
const editableFieldLevelSchema = z
  .enum(EDITABLE_FIELD_LEVELS)
  .meta({ id: 'editableFieldLevel' });

const sourcePdfSchema = z
  .strictObject({
    pdf: sourcePdfKeySchema,
    pdf_key: z.string().min(1),
    pdf_url: z.string().min(1),
  })
  .meta({ id: 'sourcePdf' });

const sourceRefSchema = z
  .strictObject({
    pdf: sourcePdfKeySchema,
    page: integer(1),
    fragment: z.string().min(1).optional(),
    note: z.string().min(1).optional(),
    pdf_key: z.string().min(1),
    pdf_url: z.string().min(1),
  })
  .meta({ id: 'sourceRef' });

const displayValueSchema = z
  .strictObject({
    value: z.number(),
    unit: z.string().min(1),
    label: z.string().min(1).optional(),
  })
  .meta({ id: 'displayValue' });

const editableFieldSchema = z
  .strictObject({
    key: editableFieldKeySchema,
    label: z.string().min(1),
    level: editableFieldLevelSchema,
    unit: z.string().min(1).optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    step: z.number().optional(),
  })
  .meta({ id: 'editableField' });

const coefficientsSchema = z
  .strictObject({
    insurance_rate: z.number().min(0),
    overhead_rate: z.number().min(0),
    profit_rate: z.number().min(0),
    usn_rate: z.number().min(0),
    vat_rate: z.number().min(0),
  })
  .meta({ id: 'coefficients' });

const costBreakdownSchema = z
  .strictObject({
    primary_salary: z.number().min(0),
    machinist_salary: z.number().min(0),
    fot: z.number().min(0),
    machines: z.number().min(0),
    materials: z.number().min(0),
    contractors: z.number().min(0),
    insurance: z.number().min(0),
    overhead: z.number().min(0),
    profit: z.number().min(0),
    usn: z.number().min(0),
    income: z.number().min(0),
    vat: z.number().min(0),
    gross: z.number().min(0),
  })
  .meta({ id: 'costBreakdown' });

const officialTotalsSchema = z
  .strictObject({
    annual_gross: z.number().min(0),
    tariff_per_sotka_month: z.number().min(0),
  })
  .meta({ id: 'officialTotals' });

const computedTotalsSchema = z
  .strictObject({
    annual_gross: z.number().min(0),
    tariff_per_sotka_month: z.number().min(0),
    delta_annual_gross: z.number(),
    delta_tariff_per_sotka_month: z.number(),
  })
  .meta({ id: 'computedTotals' });

const rowBaselineSchema = z
  .strictObject({
    is_enabled: z.boolean(),
    base: displayValueSchema.optional(),
    frequency: displayValueSchema.optional(),
    price: displayValueSchema.optional(),
    annual_gross: z.number().min(0),
    tariff_per_sotka_month: z.number().min(0),
    breakdown: costBreakdownSchema,
  })
  .meta({ id: 'rowBaseline' });

const rowComputedSchema = z
  .strictObject({
    annual_gross: z.number().min(0),
    tariff_per_sotka_month: z.number().min(0),
    delta_annual_gross: z.number(),
    delta_tariff_per_sotka_month: z.number(),
    is_enabled: z.boolean(),
    breakdown: costBreakdownSchema,
  })
  .meta({ id: 'rowComputed' });

const rowBreakdownFormulasSchema = z
  .strictObject({
    fot: z.string().min(1),
    direct: z.string().min(1),
    insurance: z.string().min(1),
    overhead: z.string().min(1),
    profit: z.string().min(1),
    usn: z.string().min(1),
    income: z.string().min(1),
    gross: z.string().min(1),
    tariff_per_sotka_month: z.string().min(1),
  })
  .meta({ id: 'rowBreakdownFormulas' });

const formulasSchema = z
  .strictObject({
    tariff_per_sotka_month: z.string().min(1),
    row_breakdown: rowBreakdownFormulasSchema,
  })
  .meta({ id: 'formulas' });

const rowSchema = z
  .strictObject({
    id: z.string().min(1),
    title: z.string().min(1),
    kind: rowKindSchema,
    coefficient_policy: coefficientPolicySchema,
    description: z.string().min(1).optional(),
    tags: z.array(z.string().min(1)).optional(),
    baseline: rowBaselineSchema,
    computed: rowComputedSchema,
    source_refs: z.array(sourceRefSchema).min(1),
    editable_fields: z.array(editableFieldSchema),
    get children() {
      return z.array(rowSchema).optional();
    },
  })
  .meta({ id: 'row' });

const sectionSchema = z
  .strictObject({
    id: z.string().min(1),
    title: z.string().min(1),
    official: officialTotalsSchema,
    computed: computedTotalsSchema,
    source_refs: z.array(sourceRefSchema).min(1),
    rows: z.array(rowSchema).min(1),
  })
  .meta({ id: 'section' });

export const reglamentPublicPayloadSchema = z
  .strictObject({
    id: z.string().min(1),
    year: integer(2000),
    title: z.string().min(1),
    tariff_area_sotki: z.number().min(0),
    coefficients: coefficientsSchema,
    official: officialTotalsSchema,
    computed: computedTotalsSchema,
    formulas: formulasSchema,
    source_refs: z.array(sourceRefSchema).min(1),
    sources: z.array(sourcePdfSchema).min(1),
    caveats: z.array(z.string().min(1)).min(1),
    sections: z.array(sectionSchema).min(1),
  })
  .meta({
    title: 'Estimate2026Payload',
    description:
      'JSON сметы регламента 2026 только для чтения: базовая смета, формулы, ссылки на источники и расчетные значения в рублях за сотку в месяц.',
  });

export const REGLAMENT_FORMULAS = {
  tariff_per_sotka_month: 'annual_gross / tariff_area_sotki / 12',
  row_breakdown: {
    fot: 'primary_salary + machinist_salary',
    direct: 'fot + machines + materials + contractors',
    insurance: 'coefficient_policy == "fot" ? fot * insurance_rate : 0',
    overhead: 'coefficient_policy == "fot" ? fot * overhead_rate : 0',
    profit: 'coefficient_policy == "fot" ? fot * profit_rate : 0',
    usn: 'coefficient_policy == "fot" ? profit * usn_rate : 0',
    income: 'direct + insurance + overhead + profit + usn',
    gross: 'income * (1 + vat_rate)',
    tariff_per_sotka_month: 'gross / tariff_area_sotki / 12',
  },
} as const satisfies z.infer<typeof formulasSchema>;

export type ReglamentPublicSourceRefDto = ReglamentPublicDto<
  typeof sourceRefSchema
>;
export type ReglamentPublicComputedTotalsDto = ReglamentPublicDto<
  typeof computedTotalsSchema
>;
export type ReglamentPublicRowDto = ReglamentPublicDto<typeof rowSchema>;
export type ReglamentPublicPayloadDto = Omit<
  ReglamentPublicDto<typeof reglamentPublicPayloadSchema>,
  'formulas'
> & {
  readonly formulas: typeof REGLAMENT_FORMULAS;
};

export const buildReglamentPublicJsonSchema = (
  id: string,
): Record<string, unknown> =>
  z.toJSONSchema(reglamentPublicPayloadSchema, {
    override: ({ zodSchema, jsonSchema }) => {
      if (zodSchema === reglamentPublicPayloadSchema) {
        jsonSchema.$id = id;
      }
    },
  });
