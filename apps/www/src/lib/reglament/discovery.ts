import { calculateEstimate } from './calculate';
import {
  reglamentApiCatalogPath,
  reglamentEstimateDetailsChecksMarkdownPath,
  reglamentEstimateDetails2026DataPath,
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
  Estimate,
  EstimateRow,
  EstimateSourcePdf,
  EstimateSourceRef,
} from './schema';
import { ESTIMATE_SOURCE_PDFS } from './schema';
import {
  buildReglamentPublicJsonSchema,
  REGLAMENT_FORMULAS,
  reglamentPublicPayloadSchema,
  type ReglamentPublicComputedTotalsDto,
  type ReglamentPublicPayloadDto,
  type ReglamentPublicRowDto,
  type ReglamentPublicSourceRefDto,
} from './public-schema';

export const PROFILE = 'https://www.rfc-editor.org/info/rfc9727';
export const OAS = 'application/vnd.oai.openapi+json';

const ESTIMATE_PAYLOAD_SCHEMA = 'Estimate2026Payload';

export { REGLAMENT_FORMULAS };

export const REGLAMENT_CAVEATS = [
  'PDF-таблицы нормализованы вручную; исходные PDF опубликованы в публичном хранилище по адресам https://media.kpshelkovo.online/815/regulation/*.pdf.',
  'final.pdf сходится с полной строкой «Доходов всего» из калькуляции, умноженной на НДС 5%, а не только с локальной строкой «Сметная стоимость».',
  'Строки с тегом «требует проверки» стоит перепроверить по исходным PDF перед юридическими или финансовыми выводами.',
] as const;

export type ReglamentDiscoverySourceRef = ReglamentPublicSourceRefDto;
export type ReglamentDiscoveryComputedTotals = ReglamentPublicComputedTotalsDto;
export type ReglamentDiscoveryRow = ReglamentPublicRowDto;
export type ReglamentDiscoveryPayload = ReglamentPublicPayloadDto;
export type ReglamentDiscoveryRowComputed = ReglamentDiscoveryRow['computed'];
export type ReglamentDiscoverySection =
  ReglamentDiscoveryPayload['sections'][number];

const abs = (root: string, path: string): string =>
  new URL(path.replace(/^\//, ''), `${root}/`).toString();

const server = (root: string): string => root.replace(/\/$/, '');

const star = (
  value: string,
): readonly { readonly value: string; readonly language: 'ru' }[] => [
  { value, language: 'ru' },
];

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

  const payload = {
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
  } satisfies ReglamentDiscoveryPayload;

  reglamentPublicPayloadSchema.parse(payload);

  return payload;
};

export const schema = (root: string): Record<string, unknown> =>
  buildReglamentPublicJsonSchema(abs(root, reglamentEstimate2026SchemaPath()));

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
        ],
      },
    ],
  };
}

export const links = (root: string): string =>
  [
    `<${abs(root, reglamentEstimate2026SchemaPath())}>; rel="service-desc"; type="application/schema+json"`,
    `<${abs(root, reglamentEstimate2026OpenApiPath())}>; rel="service-desc"; type="${OAS}"`,
    `<${abs(root, reglamentApiCatalogPath())}>; rel="api-catalog"; type="application/linkset+json"; profile="${PROFILE}"`,
  ].join(', ');

export const self = (root: string): string =>
  `<${abs(root, reglamentApiCatalogPath())}>; rel="api-catalog"; type="application/linkset+json"; profile="${PROFILE}"`;
