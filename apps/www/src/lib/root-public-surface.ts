import type { PublicSurfaceSlice } from '@/lib/public-surface/types';

import { siteApiCatalogPath, siteLlmsPath, siteMarkdownPath } from './root-routes';
import { siteSkillsPath } from './skills';

export const rootPublicSurfaceSlice = {
  owner: {
    id: 'root',
    label: 'Корневой сайт',
    entryPath: '/'
  },
  surfaces: [
    {
      id: 'root:index',
      label: 'Главная страница сайта',
      path: '/',
      mediaType: 'text/html',
      cacheClass: 'html',
      discoveryRoles: ['section-entry'],
      catalogRole: 'anchor'
    },
    {
      id: 'root:index-markdown',
      label: 'Markdown-версия корневой страницы',
      path: siteMarkdownPath(),
      mediaType: 'text/markdown',
      cacheClass: 'markdown',
      discoveryRoles: ['markdown-companion'],
      catalogRole: 'item'
    },
    {
      id: 'root:llms',
      label: 'Короткий обзор корневого сайта',
      path: siteLlmsPath(),
      mediaType: 'text/plain',
      cacheClass: 'static',
      discoveryRoles: ['llms'],
      catalogRole: 'item'
    },
    {
      id: 'root:api-catalog',
      label: 'Каталог API сайта',
      path: siteApiCatalogPath(),
      mediaType: 'application/linkset+json',
      cacheClass: 'catalog',
      discoveryRoles: ['api-catalog', 'root-catalog'],
      catalogRole: 'service-desc',
      sectionCatalogRole: false
    },
    {
      id: 'root:skills',
      label: 'Индекс инструкций для автоматического чтения корневого сайта',
      path: siteSkillsPath(),
      mediaType: 'application/json',
      cacheClass: 'data',
      discoveryRoles: ['skill-index'],
      catalogRole: 'item'
    }
  ]
} satisfies PublicSurfaceSlice;
