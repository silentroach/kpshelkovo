import { canon, withBase } from '../site';
import { ESTIMATE_SOURCE_PDFS, type EstimateSourcePdf } from './schema';

const REGLAMENT_ROOT = '/815/regulation/';
const REGLAMENT_MARKDOWN = '/815/regulation/index.md';
const REGLAMENT_FULL_MARKDOWN = '/815/regulation/full.md';
const REGLAMENT_FULL_ASSETS_MARKDOWN = '/815/regulation/full/assets.md';
const REGLAMENT_FULL_SERVICES_MARKDOWN = '/815/regulation/full/services.md';
const REGLAMENT_FULL_SERVICE_MAP_MARKDOWN =
  '/815/regulation/full/service-map.md';
const REGLAMENT_FULL_CHECKS_MARKDOWN = '/815/regulation/full/checks.md';
const REGLAMENT_ESTIMATE_DETAILS_MARKDOWN = '/815/regulation/details.md';
const REGLAMENT_ESTIMATE_DETAILS_MATERIALS_MARKDOWN =
  '/815/regulation/details/materials.md';
const REGLAMENT_ESTIMATE_DETAILS_MACHINES_MARKDOWN =
  '/815/regulation/details/machines.md';
const REGLAMENT_ESTIMATE_DETAILS_LABOR_MARKDOWN =
  '/815/regulation/details/labor.md';
const REGLAMENT_ESTIMATE_DETAILS_CHECKS_MARKDOWN =
  '/815/regulation/details/checks.md';
const REGLAMENT_DATA_ESTIMATE_2026 = '/815/regulation/data/estimate-2026.json';
const REGLAMENT_DATA_ESTIMATE_DETAILS_2026 =
  '/815/regulation/data/estimate-details-2026.json';
const REGLAMENT_DATA_FULL_2026 = '/815/regulation/data/full-2026.json';
const REGLAMENT_ASSETS = '/815/regulation/assets/';
const REGLAMENT_ASSETS_MARKDOWN = '/815/regulation/assets/index.md';
const REGLAMENT_SERVICES = '/815/regulation/services/';
const REGLAMENT_SERVICES_MARKDOWN = '/815/regulation/services/index.md';
const REGLAMENT_LLMS = '/815/regulation/llms.txt';
const REGLAMENT_LLMS_FULL = '/815/regulation/llms-full.txt';
const REGLAMENT_API_CATALOG = '/815/regulation/.well-known/api-catalog';
const REGLAMENT_SCHEMA = '/815/regulation/schemas/estimate-2026.schema.json';
const REGLAMENT_ESTIMATE_DETAILS_SCHEMA =
  '/815/regulation/schemas/estimate-details-2026.schema.json';
const REGLAMENT_OPENAPI = '/815/regulation/openapi/estimate-2026.openapi.json';
const REGLAMENT_ESTIMATE_DETAILS_OPENAPI =
  '/815/regulation/openapi/estimate-details-2026.openapi.json';
const REGLAMENT_SOURCE_PDF_ROOT =
  'https://media.kpshelkovo.online/815/regulation/';
const REGLAMENT_FULL_SOURCE_PDF =
  'https://media.kpshelkovo.online/815/regulation/full.pdf';

export type ReglamentSourcePdfUrl =
  `https://media.kpshelkovo.online/815/regulation/${EstimateSourcePdf}.pdf`;
export type ReglamentFullSourcePdfUrl = typeof REGLAMENT_FULL_SOURCE_PDF;

export const reglamentSourcePdfUrl = (
  pdf: EstimateSourcePdf,
): ReglamentSourcePdfUrl => `${REGLAMENT_SOURCE_PDF_ROOT}${pdf}.pdf`;

export const REGLAMENT_SOURCE_PDF_URLS = ESTIMATE_SOURCE_PDFS.map(
  reglamentSourcePdfUrl,
);

export const REGLAMENT_ESTIMATE_DETAILS_MARKDOWN_PATHS = [
  REGLAMENT_ESTIMATE_DETAILS_MARKDOWN,
  REGLAMENT_ESTIMATE_DETAILS_MATERIALS_MARKDOWN,
  REGLAMENT_ESTIMATE_DETAILS_MACHINES_MARKDOWN,
  REGLAMENT_ESTIMATE_DETAILS_LABOR_MARKDOWN,
  REGLAMENT_ESTIMATE_DETAILS_CHECKS_MARKDOWN,
] as const;

export type ReglamentEstimateDetailsMarkdownPath =
  (typeof REGLAMENT_ESTIMATE_DETAILS_MARKDOWN_PATHS)[number];

export const reglamentFullSourcePdfUrl = (): ReglamentFullSourcePdfUrl =>
  REGLAMENT_FULL_SOURCE_PDF;

export const REGLAMENT_PUBLIC_PATHS = [
  REGLAMENT_ROOT,
  REGLAMENT_MARKDOWN,
  REGLAMENT_FULL_MARKDOWN,
  REGLAMENT_FULL_ASSETS_MARKDOWN,
  REGLAMENT_FULL_SERVICES_MARKDOWN,
  REGLAMENT_FULL_SERVICE_MAP_MARKDOWN,
  REGLAMENT_FULL_CHECKS_MARKDOWN,
  ...REGLAMENT_ESTIMATE_DETAILS_MARKDOWN_PATHS,
  REGLAMENT_DATA_ESTIMATE_2026,
  REGLAMENT_DATA_ESTIMATE_DETAILS_2026,
  REGLAMENT_DATA_FULL_2026,
  REGLAMENT_ASSETS,
  REGLAMENT_ASSETS_MARKDOWN,
  REGLAMENT_SERVICES,
  REGLAMENT_SERVICES_MARKDOWN,
  REGLAMENT_LLMS,
  REGLAMENT_LLMS_FULL,
  REGLAMENT_SCHEMA,
  REGLAMENT_OPENAPI,
  REGLAMENT_ESTIMATE_DETAILS_SCHEMA,
  REGLAMENT_ESTIMATE_DETAILS_OPENAPI,
  REGLAMENT_API_CATALOG,
] as const;

export type ReglamentPublicPath = (typeof REGLAMENT_PUBLIC_PATHS)[number];

export const reglamentPath = (): string => REGLAMENT_ROOT;

export const reglamentMarkdownPath = (): string => REGLAMENT_MARKDOWN;

export const reglamentFullMarkdownPath = (): string => REGLAMENT_FULL_MARKDOWN;

export const reglamentFullAssetsMarkdownPath = (): string =>
  REGLAMENT_FULL_ASSETS_MARKDOWN;

export const reglamentFullServicesMarkdownPath = (): string =>
  REGLAMENT_FULL_SERVICES_MARKDOWN;

export const reglamentFullServiceMapMarkdownPath = (): string =>
  REGLAMENT_FULL_SERVICE_MAP_MARKDOWN;

export const reglamentFullChecksMarkdownPath = (): string =>
  REGLAMENT_FULL_CHECKS_MARKDOWN;

export const reglamentEstimateDetailsMarkdownPath = (): string =>
  REGLAMENT_ESTIMATE_DETAILS_MARKDOWN;

export const reglamentEstimateDetailsMaterialsMarkdownPath = (): string =>
  REGLAMENT_ESTIMATE_DETAILS_MATERIALS_MARKDOWN;

export const reglamentEstimateDetailsMachinesMarkdownPath = (): string =>
  REGLAMENT_ESTIMATE_DETAILS_MACHINES_MARKDOWN;

export const reglamentEstimateDetailsLaborMarkdownPath = (): string =>
  REGLAMENT_ESTIMATE_DETAILS_LABOR_MARKDOWN;

export const reglamentEstimateDetailsChecksMarkdownPath = (): string =>
  REGLAMENT_ESTIMATE_DETAILS_CHECKS_MARKDOWN;

export const reglamentEstimate2026DataPath = (): string =>
  REGLAMENT_DATA_ESTIMATE_2026;

export const reglamentEstimateDetails2026DataPath = (): string =>
  REGLAMENT_DATA_ESTIMATE_DETAILS_2026;

export const reglamentFull2026DataPath = (): string => REGLAMENT_DATA_FULL_2026;

export const reglamentAssetsPath = (): string => REGLAMENT_ASSETS;

export const reglamentAssetsMarkdownPath = (): string =>
  REGLAMENT_ASSETS_MARKDOWN;

export const reglamentServicesPath = (): string => REGLAMENT_SERVICES;

export const reglamentServicesMarkdownPath = (): string =>
  REGLAMENT_SERVICES_MARKDOWN;

export const reglamentLlmsPath = (): string => REGLAMENT_LLMS;

export const reglamentLlmsFullPath = (): string => REGLAMENT_LLMS_FULL;

export const reglamentApiCatalogPath = (): string => REGLAMENT_API_CATALOG;

export const reglamentEstimate2026SchemaPath = (): string => REGLAMENT_SCHEMA;

export const reglamentEstimateDetails2026SchemaPath = (): string =>
  REGLAMENT_ESTIMATE_DETAILS_SCHEMA;

export const reglamentEstimate2026OpenApiPath = (): string => REGLAMENT_OPENAPI;

export const reglamentEstimateDetails2026OpenApiPath = (): string =>
  REGLAMENT_ESTIMATE_DETAILS_OPENAPI;

export const reglamentUrl = (): string => withBase(REGLAMENT_ROOT);

export const reglamentMarkdownUrl = (): string => withBase(REGLAMENT_MARKDOWN);

export const reglamentFullMarkdownUrl = (): string =>
  withBase(REGLAMENT_FULL_MARKDOWN);

export const reglamentFullAssetsMarkdownUrl = (): string =>
  withBase(REGLAMENT_FULL_ASSETS_MARKDOWN);

export const reglamentFullServicesMarkdownUrl = (): string =>
  withBase(REGLAMENT_FULL_SERVICES_MARKDOWN);

export const reglamentFullServiceMapMarkdownUrl = (): string =>
  withBase(REGLAMENT_FULL_SERVICE_MAP_MARKDOWN);

export const reglamentFullChecksMarkdownUrl = (): string =>
  withBase(REGLAMENT_FULL_CHECKS_MARKDOWN);

export const reglamentEstimateDetailsMarkdownUrl = (): string =>
  withBase(REGLAMENT_ESTIMATE_DETAILS_MARKDOWN);

export const reglamentEstimateDetailsMaterialsMarkdownUrl = (): string =>
  withBase(REGLAMENT_ESTIMATE_DETAILS_MATERIALS_MARKDOWN);

export const reglamentEstimateDetailsMachinesMarkdownUrl = (): string =>
  withBase(REGLAMENT_ESTIMATE_DETAILS_MACHINES_MARKDOWN);

export const reglamentEstimateDetailsLaborMarkdownUrl = (): string =>
  withBase(REGLAMENT_ESTIMATE_DETAILS_LABOR_MARKDOWN);

export const reglamentEstimateDetailsChecksMarkdownUrl = (): string =>
  withBase(REGLAMENT_ESTIMATE_DETAILS_CHECKS_MARKDOWN);

export const reglamentEstimate2026DataUrl = (): string =>
  withBase(REGLAMENT_DATA_ESTIMATE_2026);

export const reglamentEstimateDetails2026DataUrl = (): string =>
  withBase(REGLAMENT_DATA_ESTIMATE_DETAILS_2026);

export const reglamentFull2026DataUrl = (): string =>
  withBase(REGLAMENT_DATA_FULL_2026);

export const reglamentAssetsUrl = (): string => withBase(REGLAMENT_ASSETS);

export const reglamentAssetsMarkdownUrl = (): string =>
  withBase(REGLAMENT_ASSETS_MARKDOWN);

export const reglamentServicesUrl = (): string => withBase(REGLAMENT_SERVICES);

export const reglamentServicesMarkdownUrl = (): string =>
  withBase(REGLAMENT_SERVICES_MARKDOWN);

export const reglamentLlmsUrl = (): string => withBase(REGLAMENT_LLMS);

export const reglamentLlmsFullUrl = (): string => withBase(REGLAMENT_LLMS_FULL);

export const reglamentApiCatalogUrl = (): string =>
  withBase(REGLAMENT_API_CATALOG);

export const reglamentEstimate2026SchemaUrl = (): string =>
  withBase(REGLAMENT_SCHEMA);

export const reglamentEstimateDetails2026SchemaUrl = (): string =>
  withBase(REGLAMENT_ESTIMATE_DETAILS_SCHEMA);

export const reglamentEstimate2026OpenApiUrl = (): string =>
  withBase(REGLAMENT_OPENAPI);

export const reglamentEstimateDetails2026OpenApiUrl = (): string =>
  withBase(REGLAMENT_ESTIMATE_DETAILS_OPENAPI);

export const reglamentCanonical = (): string => canon(REGLAMENT_ROOT);
