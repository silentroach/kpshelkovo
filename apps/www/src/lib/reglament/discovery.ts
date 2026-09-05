import { calculateEstimate } from './calculate';
import {
  buildPublicEstimateDetails2026JsonSchema,
  ESTIMATE_DETAILS_2026_PUBLIC_SCHEMA_NAME,
} from './detail-public-schema';
import {
  reglamentApiCatalogPath,
  reglamentEstimateDetailsChecksMarkdownPath,
  reglamentEstimateDetails2026DataPath,
  reglamentEstimateDetails2026OpenApiPath,
  reglamentEstimateDetails2026SchemaPath,
  reglamentEstimateDetailsLaborMarkdownPath,
  reglamentEstimateDetailsMachinesMarkdownPath,
  reglamentEstimateDetailsMarkdownPath,
  reglamentEstimateDetailsMaterialsMarkdownPath,
  reglamentEstimate2026DataPath,
  reglamentEstimate2026OpenApiPath,
  reglamentEstimate2026SchemaPath,
  reglamentAssetsMarkdownPath,
  reglamentAssetsPath,
  reglamentFull2026DataPath,
  reglamentFullAssetsMarkdownPath,
  reglamentFullChecksMarkdownPath,
  reglamentFullMarkdownPath,
  reglamentFullServiceMapMarkdownPath,
  reglamentFullServicesMarkdownPath,
  reglamentFullSourcePdfUrl,
  reglamentLlmsFullPath,
  reglamentLlmsPath,
  reglamentMarkdownPath,
  reglamentPath,
  reglamentServicesMarkdownPath,
  reglamentServicesPath,
  reglamentSourcePdfUrl,
} from './routes';
import type {
  CostBreakdown,
  EditableField,
  Estimate,
  EstimateRow,
  EstimateSourcePdf,
  EstimateSourceRef,
} from './schema';
import {
  EDITABLE_FIELD_KEYS,
  EDITABLE_FIELD_LEVELS,
  ESTIMATE_COEFFICIENT_POLICIES,
  ESTIMATE_ROW_KINDS,
  ESTIMATE_SOURCE_PDFS,
} from './schema';

export const PROFILE = 'https://www.rfc-editor.org/info/rfc9727';
export const OAS = 'application/vnd.oai.openapi+json';

const ESTIMATE_PAYLOAD_SCHEMA = 'Estimate2026Payload';

const ROW_BREAKDOWN_FORMULAS = {
  fot: 'primary_salary + machinist_salary',
  direct: 'fot + machines + materials + contractors',
  insurance: 'coefficient_policy == "fot" ? fot * insurance_rate : 0',
  overhead: 'coefficient_policy == "fot" ? fot * overhead_rate : 0',
  profit: 'coefficient_policy == "fot" ? fot * profit_rate : 0',
  usn: 'coefficient_policy == "fot" ? profit * usn_rate : 0',
  income: 'direct + insurance + overhead + profit + usn',
  gross: 'income * (1 + vat_rate)',
  tariff_per_sotka_month: 'gross / tariff_area_sotki / 12',
} as const;

export const REGLAMENT_FORMULAS = {
  tariff_per_sotka_month: 'annual_gross / tariff_area_sotki / 12',
  row_breakdown: ROW_BREAKDOWN_FORMULAS,
} as const;

export const REGLAMENT_CAVEATS = [
  'PDF-таблицы нормализованы вручную; исходные PDF опубликованы в публичном хранилище по адресам https://media.kpshelkovo.online/815/regulation/*.pdf.',
  'final.pdf сходится с полной строкой «Доходов всего» из калькуляции, умноженной на НДС 5%, а не только с локальной строкой «Сметная стоимость».',
  'Строки с тегом «требует проверки» стоит перепроверить по исходным PDF перед юридическими или финансовыми выводами.',
] as const;

export interface ReglamentDiscoverySourceRef extends EstimateSourceRef {
  readonly pdf_key: string;
  readonly pdf_url: string;
}

export interface ReglamentDiscoveryComputedTotals {
  readonly annual_gross: number;
  readonly tariff_per_sotka_month: number;
  readonly delta_annual_gross: number;
  readonly delta_tariff_per_sotka_month: number;
}

export interface ReglamentDiscoveryRowComputed extends ReglamentDiscoveryComputedTotals {
  readonly is_enabled: boolean;
  readonly breakdown: CostBreakdown;
}

export interface ReglamentDiscoveryRow {
  readonly id: string;
  readonly title: string;
  readonly kind: EstimateRow['kind'];
  readonly coefficient_policy: EstimateRow['coefficient_policy'];
  readonly description?: string;
  readonly tags?: readonly string[];
  readonly baseline: EstimateRow['baseline'];
  readonly computed: ReglamentDiscoveryRowComputed;
  readonly source_refs: readonly ReglamentDiscoverySourceRef[];
  readonly editable_fields: readonly EditableField[];
  readonly children?: readonly ReglamentDiscoveryRow[];
}

export interface ReglamentDiscoverySection {
  readonly id: string;
  readonly title: string;
  readonly official: Estimate['sections'][number]['baseline'];
  readonly computed: ReglamentDiscoveryComputedTotals;
  readonly source_refs: readonly ReglamentDiscoverySourceRef[];
  readonly rows: readonly ReglamentDiscoveryRow[];
}

export interface ReglamentDiscoveryPayload {
  readonly id: string;
  readonly year: number;
  readonly title: string;
  readonly tariff_area_sotki: number;
  readonly coefficients: Estimate['coefficients'];
  readonly official: Estimate['baseline'];
  readonly computed: ReglamentDiscoveryComputedTotals;
  readonly formulas: typeof REGLAMENT_FORMULAS;
  readonly source_refs: readonly ReglamentDiscoverySourceRef[];
  readonly sources: readonly {
    readonly pdf: EstimateSourcePdf;
    readonly pdf_key: string;
    readonly pdf_url: string;
  }[];
  readonly caveats: readonly string[];
  readonly sections: readonly ReglamentDiscoverySection[];
}

const abs = (root: string, path: string): string =>
  new URL(path.replace(/^\//, ''), `${root}/`).toString();

const server = (root: string): string => root.replace(/\/$/, '');

const star = (
  value: string,
): readonly { readonly value: string; readonly language: 'ru' }[] => [
  { value, language: 'ru' },
];

const text = (minLength = 0): Record<string, unknown> => ({
  type: 'string',
  ...(minLength > 0 ? { minLength } : {}),
});

const integer = (minimum = 0): Record<string, unknown> => ({
  type: 'integer',
  minimum,
});

const number = (minimum?: number): Record<string, unknown> => ({
  type: 'number',
  ...(minimum === undefined ? {} : { minimum }),
});

const flag = (): Record<string, unknown> => ({ type: 'boolean' });

const list = (
  items: Record<string, unknown>,
  extra?: Record<string, unknown>,
): Record<string, unknown> => ({
  type: 'array',
  items,
  ...(extra ?? {}),
});

const obj = (
  properties: Record<string, unknown>,
  required: readonly string[],
): Record<string, unknown> => ({
  type: 'object',
  additionalProperties: false,
  properties,
  required,
});

function rewriteSchemaRefs(value: unknown, schemaRef: string): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => rewriteSchemaRefs(item, schemaRef));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => {
      if (
        key === '$ref' &&
        typeof entry === 'string' &&
        entry.startsWith('#/')
      ) {
        return [key, `${schemaRef}${entry.slice(1)}`];
      }

      return [key, rewriteSchemaRefs(entry, schemaRef)];
    }),
  );
}

export const estimateSourcePdfKey = (pdf: EstimateSourcePdf): string =>
  `815/regulation/${pdf}.pdf`;

const sourceRef = (ref: EstimateSourceRef): ReglamentDiscoverySourceRef => ({
  ...ref,
  pdf_key: estimateSourcePdfKey(ref.pdf),
  pdf_url: reglamentSourcePdfUrl(ref.pdf),
});

const sources = (): ReglamentDiscoveryPayload['sources'] =>
  ESTIMATE_SOURCE_PDFS.map((pdf) => ({
    pdf,
    pdf_key: estimateSourcePdfKey(pdf),
    pdf_url: reglamentSourcePdfUrl(pdf),
  }));

const computedTotals = (
  item: ReglamentDiscoveryComputedTotals,
): ReglamentDiscoveryComputedTotals => ({
  annual_gross: item.annual_gross,
  tariff_per_sotka_month: item.tariff_per_sotka_month,
  delta_annual_gross: item.delta_annual_gross,
  delta_tariff_per_sotka_month: item.delta_tariff_per_sotka_month,
});

const expectItem = <T>(value: T | undefined, message: string): T => {
  if (!value) {
    throw new Error(message);
  }

  return value;
};

const rowPayload = (
  row: EstimateRow,
  calculated: ReturnType<
    typeof calculateEstimate
  >['sections'][number]['rows'][number],
): ReglamentDiscoveryRow => {
  const calculatedChildren = new Map(
    calculated.children?.map((child) => [child.id, child]) ?? [],
  );
  const children = row.children?.map((child) =>
    rowPayload(
      child,
      expectItem(
        calculatedChildren.get(child.id),
        `Missing calculated child row ${child.id}`,
      ),
    ),
  );

  return {
    id: row.id,
    title: row.title,
    kind: row.kind,
    coefficient_policy: row.coefficient_policy,
    ...(row.description ? { description: row.description } : {}),
    ...(row.tags ? { tags: [...row.tags] } : {}),
    baseline: {
      ...row.baseline,
      breakdown: { ...row.baseline.breakdown },
    },
    computed: {
      ...computedTotals(calculated),
      is_enabled: calculated.is_enabled,
      breakdown: { ...calculated.breakdown },
    },
    source_refs: row.source_refs.map(sourceRef),
    editable_fields: row.editable_fields.map((field) => ({ ...field })),
    ...(children && children.length > 0 ? { children } : {}),
  };
};

export const buildReglamentPayload = (
  estimate: Estimate,
): ReglamentDiscoveryPayload => {
  const calculated = calculateEstimate(estimate);
  const calculatedSections = new Map(
    calculated.sections.map((section) => [section.id, section]),
  );

  return {
    id: estimate.id,
    year: estimate.year,
    title: estimate.title,
    tariff_area_sotki: estimate.tariff_area_sotki,
    coefficients: { ...estimate.coefficients },
    official: { ...estimate.baseline },
    computed: computedTotals(calculated),
    formulas: REGLAMENT_FORMULAS,
    source_refs: estimate.source_refs.map(sourceRef),
    sources: sources(),
    caveats: [...REGLAMENT_CAVEATS],
    sections: estimate.sections.map((section) => {
      const calculatedSection = expectItem(
        calculatedSections.get(section.id),
        `Missing calculated section ${section.id}`,
      );
      const calculatedRows = new Map(
        calculatedSection.rows.map((row) => [row.id, row]),
      );

      return {
        id: section.id,
        title: section.title,
        official: { ...section.baseline },
        computed: computedTotals(calculatedSection),
        source_refs: section.source_refs.map(sourceRef),
        rows: section.rows.map((row) =>
          rowPayload(
            row,
            expectItem(
              calculatedRows.get(row.id),
              `Missing calculated row ${row.id}`,
            ),
          ),
        ),
      };
    }),
  };
};

export function schema(root: string): Record<string, unknown> {
  const sourceRefSchema = { $ref: '#/$defs/sourceRef' };
  const displayValueSchema = { $ref: '#/$defs/displayValue' };

  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: abs(root, reglamentEstimate2026SchemaPath()),
    title: ESTIMATE_PAYLOAD_SCHEMA,
    description:
      'JSON сметы регламента 2026 только для чтения: базовая смета, формулы, ссылки на источники и расчетные значения в рублях за сотку в месяц.',
    type: 'object',
    additionalProperties: false,
    required: [
      'id',
      'year',
      'title',
      'tariff_area_sotki',
      'coefficients',
      'official',
      'computed',
      'formulas',
      'source_refs',
      'sources',
      'caveats',
      'sections',
    ],
    properties: {
      id: text(1),
      year: integer(2000),
      title: text(1),
      tariff_area_sotki: number(0),
      coefficients: { $ref: '#/$defs/coefficients' },
      official: { $ref: '#/$defs/officialTotals' },
      computed: { $ref: '#/$defs/computedTotals' },
      formulas: { $ref: '#/$defs/formulas' },
      source_refs: list(sourceRefSchema, { minItems: 1 }),
      sources: list({ $ref: '#/$defs/sourcePdf' }, { minItems: 1 }),
      caveats: list(text(1), { minItems: 1 }),
      sections: list({ $ref: '#/$defs/section' }, { minItems: 1 }),
    },
    $defs: {
      sourcePdfKey: {
        enum: [...ESTIMATE_SOURCE_PDFS],
      },
      rowKind: {
        enum: [...ESTIMATE_ROW_KINDS],
      },
      coefficientPolicy: {
        enum: [...ESTIMATE_COEFFICIENT_POLICIES],
      },
      editableFieldKey: {
        enum: [...EDITABLE_FIELD_KEYS],
      },
      editableFieldLevel: {
        enum: [...EDITABLE_FIELD_LEVELS],
      },
      sourcePdf: obj(
        {
          pdf: { $ref: '#/$defs/sourcePdfKey' },
          pdf_key: text(1),
          pdf_url: text(1),
        },
        ['pdf', 'pdf_key', 'pdf_url'],
      ),
      sourceRef: obj(
        {
          pdf: { $ref: '#/$defs/sourcePdfKey' },
          pdf_key: text(1),
          pdf_url: text(1),
          page: integer(1),
          fragment: text(1),
          note: text(1),
        },
        ['pdf', 'pdf_key', 'pdf_url', 'page'],
      ),
      displayValue: obj(
        {
          value: number(),
          unit: text(1),
          label: text(1),
        },
        ['value', 'unit'],
      ),
      editableField: obj(
        {
          key: { $ref: '#/$defs/editableFieldKey' },
          label: text(1),
          level: { $ref: '#/$defs/editableFieldLevel' },
          unit: text(1),
          min: number(),
          max: number(),
          step: number(),
        },
        ['key', 'label', 'level'],
      ),
      coefficients: obj(
        {
          insurance_rate: number(0),
          overhead_rate: number(0),
          profit_rate: number(0),
          usn_rate: number(0),
          vat_rate: number(0),
        },
        [
          'insurance_rate',
          'overhead_rate',
          'profit_rate',
          'usn_rate',
          'vat_rate',
        ],
      ),
      costBreakdown: obj(
        {
          primary_salary: number(0),
          machinist_salary: number(0),
          fot: number(0),
          machines: number(0),
          materials: number(0),
          contractors: number(0),
          insurance: number(0),
          overhead: number(0),
          profit: number(0),
          usn: number(0),
          income: number(0),
          vat: number(0),
          gross: number(0),
        },
        [
          'primary_salary',
          'machinist_salary',
          'fot',
          'machines',
          'materials',
          'contractors',
          'insurance',
          'overhead',
          'profit',
          'usn',
          'income',
          'vat',
          'gross',
        ],
      ),
      officialTotals: obj(
        {
          annual_gross: number(0),
          tariff_per_sotka_month: number(0),
        },
        ['annual_gross', 'tariff_per_sotka_month'],
      ),
      computedTotals: obj(
        {
          annual_gross: number(0),
          tariff_per_sotka_month: number(0),
          delta_annual_gross: number(),
          delta_tariff_per_sotka_month: number(),
        },
        [
          'annual_gross',
          'tariff_per_sotka_month',
          'delta_annual_gross',
          'delta_tariff_per_sotka_month',
        ],
      ),
      rowBaseline: obj(
        {
          is_enabled: flag(),
          base: displayValueSchema,
          frequency: displayValueSchema,
          price: displayValueSchema,
          annual_gross: number(0),
          tariff_per_sotka_month: number(0),
          breakdown: { $ref: '#/$defs/costBreakdown' },
        },
        ['is_enabled', 'annual_gross', 'tariff_per_sotka_month', 'breakdown'],
      ),
      rowComputed: obj(
        {
          is_enabled: flag(),
          annual_gross: number(0),
          tariff_per_sotka_month: number(0),
          delta_annual_gross: number(),
          delta_tariff_per_sotka_month: number(),
          breakdown: { $ref: '#/$defs/costBreakdown' },
        },
        [
          'is_enabled',
          'annual_gross',
          'tariff_per_sotka_month',
          'delta_annual_gross',
          'delta_tariff_per_sotka_month',
          'breakdown',
        ],
      ),
      rowBreakdownFormulas: obj(
        Object.fromEntries(
          Object.keys(ROW_BREAKDOWN_FORMULAS).map((key) => [key, text(1)]),
        ),
        Object.keys(ROW_BREAKDOWN_FORMULAS),
      ),
      formulas: obj(
        {
          tariff_per_sotka_month: text(1),
          row_breakdown: { $ref: '#/$defs/rowBreakdownFormulas' },
        },
        ['tariff_per_sotka_month', 'row_breakdown'],
      ),
      row: obj(
        {
          id: text(1),
          title: text(1),
          kind: { $ref: '#/$defs/rowKind' },
          coefficient_policy: { $ref: '#/$defs/coefficientPolicy' },
          description: text(1),
          tags: list(text(1)),
          baseline: { $ref: '#/$defs/rowBaseline' },
          computed: { $ref: '#/$defs/rowComputed' },
          source_refs: list(sourceRefSchema, { minItems: 1 }),
          editable_fields: list({ $ref: '#/$defs/editableField' }),
          children: list({ $ref: '#/$defs/row' }),
        },
        [
          'id',
          'title',
          'kind',
          'coefficient_policy',
          'baseline',
          'computed',
          'source_refs',
          'editable_fields',
        ],
      ),
      section: obj(
        {
          id: text(1),
          title: text(1),
          official: { $ref: '#/$defs/officialTotals' },
          computed: { $ref: '#/$defs/computedTotals' },
          source_refs: list(sourceRefSchema, { minItems: 1 }),
          rows: list({ $ref: '#/$defs/row' }, { minItems: 1 }),
        },
        ['id', 'title', 'official', 'computed', 'source_refs', 'rows'],
      ),
    },
  };
}

export function openapi(root: string): Record<string, unknown> {
  const schemaRef = `#/components/schemas/${ESTIMATE_PAYLOAD_SCHEMA}`;
  const body = Object.fromEntries(
    Object.entries(schema(root)).filter(
      ([key]) => key !== '$schema' && key !== '$id',
    ),
  );
  const componentBody = rewriteSchemaRefs(body, schemaRef);

  return {
    openapi: '3.1.0',
    jsonSchemaDialect: 'https://json-schema.org/draft/2020-12/schema',
    info: {
      title: 'Шелково Reglament Estimate 2026 JSON',
      version: '1.0.0',
      description:
        'OpenAPI-описание JSON /815/regulation/data/estimate-2026.json только для чтения: базовая смета, формулы, ссылки на источники и расчетные значения.',
    },
    servers: [
      {
        url: server(root),
      },
    ],
    paths: {
      [reglamentEstimate2026DataPath()]: {
        get: {
          operationId: 'getReglamentEstimate2026',
          summary: 'Read reglament estimate 2026 JSON',
          description:
            'Возвращает нормализованную смету регламента 2026: официальную базу, формулы пересчета, секции, строки, ссылки на источники и расчетные тарифы.',
          responses: {
            200: {
              description: 'Полный JSON сметы регламента 2026',
              content: {
                'application/json': {
                  schema: {
                    $ref: schemaRef,
                  },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        [ESTIMATE_PAYLOAD_SCHEMA]: componentBody,
      },
    },
  };
}

export const detailSchema = (root: string): Record<string, unknown> =>
  buildPublicEstimateDetails2026JsonSchema(
    abs(root, reglamentEstimateDetails2026SchemaPath()),
  );

export function detailOpenapi(root: string): Record<string, unknown> {
  const schemaRef = `#/components/schemas/${ESTIMATE_DETAILS_2026_PUBLIC_SCHEMA_NAME}`;
  const body = Object.fromEntries(
    Object.entries(detailSchema(root)).filter(
      ([key]) => key !== '$schema' && key !== '$id',
    ),
  );

  return {
    openapi: '3.1.0',
    jsonSchemaDialect: 'https://json-schema.org/draft/2020-12/schema',
    info: {
      title: 'Шелково Reglament Estimate Details 2026 JSON',
      version: '2.0.0',
      description:
        'OpenAPI-описание детальной сметы регламента 2026: работ, ресурсов, контрольных итогов и ссылок на фрагменты исходных PDF.',
    },
    servers: [
      {
        url: server(root),
      },
    ],
    paths: {
      [reglamentEstimateDetails2026DataPath()]: {
        get: {
          operationId: 'getReglamentEstimateDetails2026',
          summary: 'Read reglament estimate details 2026 JSON',
          description:
            'Возвращает детальные работы, ресурсы, контрольные итоги и нормализованный реестр ссылок на фрагменты исходных PDF.',
          responses: {
            200: {
              description: 'Детальный JSON сметы регламента 2026',
              content: {
                'application/json': {
                  schema: {
                    $ref: schemaRef,
                  },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        [ESTIMATE_DETAILS_2026_PUBLIC_SCHEMA_NAME]: rewriteSchemaRefs(
          body,
          schemaRef,
        ),
      },
    },
  };
}

export function catalog(root: string): Record<string, unknown> {
  return {
    linkset: [
      {
        anchor: abs(root, reglamentPath()),
        item: [
          {
            href: abs(root, reglamentMarkdownPath()),
            type: 'text/markdown',
            'title*': star('Markdown-версия калькулятора тарифа по смете 2026'),
          },
          {
            href: abs(root, reglamentFullMarkdownPath()),
            type: 'text/markdown',
            'title*': star(
              'Индекс Markdown-версий полного регламента содержания Шелково',
            ),
          },
          {
            href: abs(root, reglamentFullAssetsMarkdownPath()),
            type: 'text/markdown',
            'title*': star('Markdown полного регламента: общее имущество'),
          },
          {
            href: abs(root, reglamentFullServicesMarkdownPath()),
            type: 'text/markdown',
            'title*': star('Markdown полного регламента: услуги'),
          },
          {
            href: abs(root, reglamentFullServiceMapMarkdownPath()),
            type: 'text/markdown',
            'title*': star(
              'Markdown полного регламента: сопоставление услуг со сметой',
            ),
          },
          {
            href: abs(root, reglamentFullChecksMarkdownPath()),
            type: 'text/markdown',
            'title*': star('Markdown полного регламента: проверки и допущения'),
          },
          {
            href: abs(root, reglamentEstimateDetailsMarkdownPath()),
            type: 'text/markdown',
            'title*': star('Markdown детальной сметы: индекс'),
          },
          {
            href: abs(root, reglamentEstimateDetailsMaterialsMarkdownPath()),
            type: 'text/markdown',
            'title*': star('Markdown детальной сметы: материалы'),
          },
          {
            href: abs(root, reglamentEstimateDetailsMachinesMarkdownPath()),
            type: 'text/markdown',
            'title*': star('Markdown детальной сметы: машины'),
          },
          {
            href: abs(root, reglamentEstimateDetailsLaborMarkdownPath()),
            type: 'text/markdown',
            'title*': star('Markdown детальной сметы: труд'),
          },
          {
            href: abs(root, reglamentEstimateDetailsChecksMarkdownPath()),
            type: 'text/markdown',
            'title*': star('Markdown детальной сметы: проверки'),
          },
          {
            href: abs(root, reglamentEstimate2026DataPath()),
            type: 'application/json',
            'title*': star(
              'Основной машиночитаемый JSON сметы регламента 2026',
            ),
          },
          {
            href: abs(root, reglamentEstimateDetails2026DataPath()),
            type: 'application/json',
            'title*': star(
              'Детальный машиночитаемый JSON сметы регламента 2026',
            ),
          },
          {
            href: abs(root, reglamentFull2026DataPath()),
            type: 'application/json',
            'title*': star(
              'Набор данных полного регламента: имущество, услуги, сопоставления и заметки аудита',
            ),
          },
          {
            href: abs(root, reglamentAssetsPath()),
            type: 'text/html',
            'title*': star('Страница общего имущества из полного регламента'),
          },
          {
            href: abs(root, reglamentAssetsMarkdownPath()),
            type: 'text/markdown',
            'title*': star(
              'Markdown-версия общего имущества из полного регламента',
            ),
          },
          {
            href: abs(root, reglamentServicesPath()),
            type: 'text/html',
            'title*': star('Страница услуг и сопоставления со сметой'),
          },
          {
            href: abs(root, reglamentServicesMarkdownPath()),
            type: 'text/markdown',
            'title*': star('Markdown-версия услуг и сопоставления со сметой'),
          },
          {
            href: reglamentFullSourcePdfUrl(),
            type: 'application/pdf',
            'title*': star('Исходный PDF полного регламента'),
          },
          {
            href: abs(root, reglamentLlmsPath()),
            type: 'text/plain',
            'title*': star('Короткий обзор llms.txt'),
          },
          {
            href: abs(root, reglamentLlmsFullPath()),
            type: 'text/plain',
            'title*': star('Подробный обзор llms-full.txt'),
          },
          ...ESTIMATE_SOURCE_PDFS.map((pdf) => ({
            href: reglamentSourcePdfUrl(pdf),
            type: 'application/pdf',
            'title*': star(`Исходный PDF сметы регламента: ${pdf}.pdf`),
          })),
        ],
        'service-desc': [
          {
            href: abs(root, reglamentEstimate2026SchemaPath()),
            type: 'application/schema+json',
            'title*': star('JSON Schema для данных сметы регламента 2026'),
          },
          {
            href: abs(root, reglamentEstimate2026OpenApiPath()),
            type: OAS,
            'title*': star('OpenAPI для данных сметы регламента 2026'),
          },
          {
            href: abs(root, reglamentEstimateDetails2026SchemaPath()),
            type: 'application/schema+json',
            'title*': star('JSON Schema детальной сметы регламента 2026'),
          },
          {
            href: abs(root, reglamentEstimateDetails2026OpenApiPath()),
            type: OAS,
            'title*': star('OpenAPI детальной сметы регламента 2026'),
          },
        ],
      },
    ],
  };
}

const discoveryLinks = (
  root: string,
  schemaPath: string,
  openApiPath: string,
): string =>
  [
    `<${abs(root, schemaPath)}>; rel="service-desc"; type="application/schema+json"`,
    `<${abs(root, openApiPath)}>; rel="service-desc"; type="${OAS}"`,
    `<${abs(root, reglamentApiCatalogPath())}>; rel="api-catalog"; type="application/linkset+json"; profile="${PROFILE}"`,
  ].join(', ');

export const links = (root: string): string =>
  discoveryLinks(
    root,
    reglamentEstimate2026SchemaPath(),
    reglamentEstimate2026OpenApiPath(),
  );

export const detailLinks = (root: string): string =>
  discoveryLinks(
    root,
    reglamentEstimateDetails2026SchemaPath(),
    reglamentEstimateDetails2026OpenApiPath(),
  );

export const self = (root: string): string =>
  `<${abs(root, reglamentApiCatalogPath())}>; rel="api-catalog"; type="application/linkset+json"; profile="${PROFILE}"`;
