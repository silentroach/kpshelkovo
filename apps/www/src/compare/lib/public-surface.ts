import type { PublicSurfaceSlice } from '@/lib/public-surface/types';

import { CATALOG, EXPLORER, FEED, OAS, OPENAPI, SCHEMA } from './discovery';
import { withBase } from './url';

const SKILLS = '/.well-known/agent-skills/index.json';

export const comparePath = (): string => withBase('/');
export const compareRatingPath = (): string => withBase('/rating/');
export const compareSettlementPattern = (): string =>
  withBase('/settlements/:slug/');
export const compareMarkdownPath = (): string => withBase('/index.md');
export const compareRatingMarkdownPath = (): string =>
  withBase('/rating/index.md');
export const compareSettlementMarkdownPattern = (): string =>
  withBase('/settlements/:slug/index.md');
export const compareSettlementsDataPath = (): string => withBase(FEED);
export const compareExplorerDataPath = (): string => withBase(EXPLORER);
export const compareSchemaPath = (): string => withBase(SCHEMA);
export const compareOpenApiPath = (): string => withBase(OPENAPI);
export const compareApiCatalogPath = (): string => withBase(CATALOG);
export const compareLlmsPath = (): string => withBase('/llms.txt');
export const compareLlmsFullPath = (): string => withBase('/llms-full.txt');
export const compareSkillsPath = (): string => withBase(SKILLS);

export const comparePublicSurfaceSlice = {
  owner: {
    id: 'compare',
    label: 'Сравнение поселков',
    entryPath: comparePath(),
  },
  surfaces: [
    {
      id: 'compare:index',
      label: 'Сравнение тарифов поселков',
      path: comparePath(),
      mediaType: 'text/html',
      cacheClass: 'html',
      discoveryRoles: ['section-entry'],
      catalogRole: 'anchor',
    },
    {
      id: 'compare:rating',
      label: 'Методика рейтинга поселков',
      path: compareRatingPath(),
      mediaType: 'text/html',
      cacheClass: 'html',
      discoveryRoles: ['detail-page'],
    },
    {
      id: 'compare:settlement',
      label: 'Страница поселка',
      routePattern: compareSettlementPattern(),
      mediaType: 'text/html',
      cacheClass: 'html',
      discoveryRoles: ['detail-page'],
    },
    {
      id: 'compare:index-markdown',
      label: 'Markdown-версия сравнения поселков',
      path: compareMarkdownPath(),
      mediaType: 'text/markdown',
      cacheClass: 'markdown',
      discoveryRoles: ['markdown-companion'],
      catalogRole: 'item',
    },
    {
      id: 'compare:rating-markdown',
      label: 'Markdown-версия методики рейтинга',
      path: compareRatingMarkdownPath(),
      mediaType: 'text/markdown',
      cacheClass: 'markdown',
      discoveryRoles: ['markdown-companion'],
      catalogRole: 'item',
    },
    {
      id: 'compare:settlement-markdown',
      label: 'Markdown-версия поселка',
      routePattern: compareSettlementMarkdownPattern(),
      mediaType: 'text/markdown',
      cacheClass: 'markdown',
      discoveryRoles: ['markdown-companion'],
    },
    {
      id: 'compare:data-settlements',
      label: 'Полная машиночитаемая лента поселков',
      path: compareSettlementsDataPath(),
      mediaType: 'application/json',
      cacheClass: 'data',
      discoveryRoles: ['data-feed', 'root-catalog'],
      catalogRole: 'item',
      prerenderedApiContract: true,
    },
    {
      id: 'compare:data-explorer',
      label: 'Облегченная лента explorer для списка и карты',
      path: compareExplorerDataPath(),
      mediaType: 'application/json',
      cacheClass: 'data',
      discoveryRoles: ['data-feed'],
      catalogRole: 'item',
    },
    {
      id: 'compare:schema',
      label: 'JSON Schema полной ленты поселков',
      path: compareSchemaPath(),
      mediaType: 'application/schema+json',
      cacheClass: 'schema',
      discoveryRoles: ['schema'],
      catalogRole: 'service-desc',
      prerenderedApiContract: true,
    },
    {
      id: 'compare:openapi',
      label: 'OpenAPI полной ленты поселков',
      path: compareOpenApiPath(),
      mediaType: OAS,
      cacheClass: 'schema',
      discoveryRoles: ['schema'],
      catalogRole: 'service-desc',
      prerenderedApiContract: true,
    },
    {
      id: 'compare:api-catalog',
      label: 'Каталог API сравнения поселков',
      path: compareApiCatalogPath(),
      mediaType: 'application/linkset+json',
      cacheClass: 'catalog',
      discoveryRoles: ['api-catalog', 'root-catalog'],
      catalogRole: 'service-desc',
      sectionCatalogRole: false,
    },
    {
      id: 'compare:llms',
      label: 'Агентный обзор сравнения поселков',
      path: compareLlmsPath(),
      mediaType: 'text/plain',
      cacheClass: 'static',
      discoveryRoles: ['llms', 'root-catalog'],
      catalogRole: 'item',
    },
    {
      id: 'compare:llms-full',
      label: 'Подробный обзор сравнения поселков',
      path: compareLlmsFullPath(),
      mediaType: 'text/plain',
      cacheClass: 'static',
      discoveryRoles: ['llms'],
      catalogRole: 'item',
    },
    {
      id: 'compare:skills',
      label: 'Индекс инструкций для автоматического чтения сравнения поселков',
      path: compareSkillsPath(),
      mediaType: 'application/json',
      cacheClass: 'data',
      discoveryRoles: ['skill-index'],
      catalogRole: 'item',
    },
  ],
} satisfies PublicSurfaceSlice;
