import type {
  PublicSurface,
  PublicSurfaceSlice,
} from '@/lib/public-surface/types';

import {
  REGLAMENT_ESTIMATE_DETAILS_MARKDOWN_PATHS,
  REGLAMENT_SOURCE_PDF_URLS,
  reglamentApiCatalogPath,
  reglamentAssetsMarkdownPath,
  reglamentAssetsPath,
  reglamentEstimate2026DataPath,
  reglamentEstimate2026OpenApiPath,
  reglamentEstimate2026SchemaPath,
  reglamentEstimateDetails2026OpenApiPath,
  reglamentEstimateDetails2026SchemaPath,
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
  reglamentEstimateDetails2026DataPath,
} from './routes';

const markdownSurface = (
  id: string,
  label: string,
  path: string,
): PublicSurface => ({
  id,
  label,
  path,
  mediaType: 'text/markdown',
  cacheClass: 'markdown',
  discoveryRoles: ['markdown-companion'],
  catalogRole: 'item',
});

const dataSurface = (
  id: string,
  label: string,
  path: string,
): PublicSurface => ({
  id,
  label,
  path,
  mediaType: 'application/json',
  cacheClass: 'data',
  discoveryRoles: ['data-feed', 'root-catalog'],
  catalogRole: 'item',
});

const pdfSurface = (
  id: string,
  label: string,
  path: string,
): PublicSurface => ({
  id,
  label,
  path,
  mediaType: 'application/pdf',
  cacheClass: 'static',
  discoveryRoles: ['download'],
  catalogRole: 'item',
});

export const reglamentPublicSurfaceSlice = {
  owner: {
    id: 'reglament',
    label: 'Регламент',
    entryPath: reglamentPath(),
  },
  surfaces: [
    {
      id: 'reglament:index',
      label: 'Калькулятор тарифа по смете 2026',
      path: reglamentPath(),
      mediaType: 'text/html',
      cacheClass: 'html',
      discoveryRoles: ['section-entry'],
      catalogRole: 'anchor',
      linkRelations: [
        {
          rel: 'alternate',
          href: reglamentMarkdownPath(),
          mediaType: 'text/markdown',
        },
      ],
      acceptsNegotiation: 'required',
    },
    markdownSurface(
      'reglament:index-markdown',
      'Markdown-версия регламента',
      reglamentMarkdownPath(),
    ),
    markdownSurface(
      'reglament:full-markdown',
      'Markdown-версия полного регламента',
      reglamentFullMarkdownPath(),
    ),
    markdownSurface(
      'reglament:full-assets-markdown',
      'Markdown-версия полного регламента: общее имущество',
      reglamentFullAssetsMarkdownPath(),
    ),
    markdownSurface(
      'reglament:full-services-markdown',
      'Markdown-версия полного регламента: услуги',
      reglamentFullServicesMarkdownPath(),
    ),
    markdownSurface(
      'reglament:full-service-map-markdown',
      'Markdown-версия полного регламента: сопоставление услуг со сметой',
      reglamentFullServiceMapMarkdownPath(),
    ),
    markdownSurface(
      'reglament:full-checks-markdown',
      'Markdown-версия полного регламента: проверки и допущения',
      reglamentFullChecksMarkdownPath(),
    ),
    ...REGLAMENT_ESTIMATE_DETAILS_MARKDOWN_PATHS.map((path, index) =>
      markdownSurface(
        `reglament:details-markdown-${index}`,
        'Markdown-версия детальной сметы регламента',
        path,
      ),
    ),
    dataSurface(
      'reglament:data-estimate-2026',
      'Основной машиночитаемый JSON-файл сметы регламента 2026',
      reglamentEstimate2026DataPath(),
    ),
    dataSurface(
      'reglament:data-estimate-details-2026',
      'Детальный машиночитаемый JSON-файл сметы регламента 2026',
      reglamentEstimateDetails2026DataPath(),
    ),
    dataSurface(
      'reglament:data-full-2026',
      'Набор данных полного регламента',
      reglamentFull2026DataPath(),
    ),
    {
      id: 'reglament:assets',
      label: 'Страница общего имущества из полного регламента',
      path: reglamentAssetsPath(),
      mediaType: 'text/html',
      cacheClass: 'html',
      discoveryRoles: ['detail-page'],
      catalogRole: 'item',
      linkRelations: [
        {
          rel: 'alternate',
          href: reglamentAssetsMarkdownPath(),
          mediaType: 'text/markdown',
        },
      ],
      acceptsNegotiation: 'required',
    },
    markdownSurface(
      'reglament:assets-markdown',
      'Markdown-версия общего имущества из полного регламента',
      reglamentAssetsMarkdownPath(),
    ),
    {
      id: 'reglament:services',
      label: 'Страница услуг и сопоставления со сметой',
      path: reglamentServicesPath(),
      mediaType: 'text/html',
      cacheClass: 'html',
      discoveryRoles: ['detail-page'],
      catalogRole: 'item',
      linkRelations: [
        {
          rel: 'alternate',
          href: reglamentServicesMarkdownPath(),
          mediaType: 'text/markdown',
        },
      ],
      acceptsNegotiation: 'required',
    },
    markdownSurface(
      'reglament:services-markdown',
      'Markdown-версия услуг и сопоставления со сметой',
      reglamentServicesMarkdownPath(),
    ),
    {
      id: 'reglament:llms',
      label: 'Агентный обзор регламента',
      path: reglamentLlmsPath(),
      mediaType: 'text/plain',
      cacheClass: 'static',
      discoveryRoles: ['llms', 'root-catalog'],
      catalogRole: 'item',
    },
    {
      id: 'reglament:llms-full',
      label: 'Подробный обзор регламента',
      path: reglamentLlmsFullPath(),
      mediaType: 'text/plain',
      cacheClass: 'static',
      discoveryRoles: ['llms'],
      catalogRole: 'item',
    },
    {
      id: 'reglament:schema',
      label: 'JSON Schema для данных сметы регламента 2026',
      path: reglamentEstimate2026SchemaPath(),
      mediaType: 'application/schema+json',
      cacheClass: 'schema',
      discoveryRoles: ['schema'],
      catalogRole: 'service-desc',
    },
    {
      id: 'reglament:openapi',
      label: 'OpenAPI для данных сметы регламента 2026',
      path: reglamentEstimate2026OpenApiPath(),
      mediaType: 'application/vnd.oai.openapi+json',
      cacheClass: 'schema',
      discoveryRoles: ['schema'],
      catalogRole: 'service-desc',
    },
    {
      id: 'reglament:details-schema',
      label: 'JSON Schema детальной сметы регламента 2026',
      path: reglamentEstimateDetails2026SchemaPath(),
      mediaType: 'application/schema+json',
      cacheClass: 'schema',
      discoveryRoles: ['schema'],
      catalogRole: 'service-desc',
    },
    {
      id: 'reglament:details-openapi',
      label: 'OpenAPI детальной сметы регламента 2026',
      path: reglamentEstimateDetails2026OpenApiPath(),
      mediaType: 'application/vnd.oai.openapi+json',
      cacheClass: 'schema',
      discoveryRoles: ['schema'],
      catalogRole: 'service-desc',
    },
    {
      id: 'reglament:api-catalog',
      label: 'Каталог API регламента',
      path: reglamentApiCatalogPath(),
      mediaType: 'application/linkset+json',
      cacheClass: 'catalog',
      discoveryRoles: ['api-catalog', 'root-catalog'],
      catalogRole: 'service-desc',
      sectionCatalogRole: false,
    },
    pdfSurface(
      'reglament:source-full-pdf',
      'Исходный PDF полного регламента',
      reglamentFullSourcePdfUrl(),
    ),
    ...REGLAMENT_SOURCE_PDF_URLS.map((url) =>
      pdfSurface(
        `reglament:source-pdf:${url.split('/').at(-1) ?? url}`,
        'Исходный PDF сметы регламента',
        url,
      ),
    ),
  ],
} satisfies PublicSurfaceSlice;
