import type { PublicSurfaceSlice } from '@/lib/public-surface/types';

import { kbDetailMarkdownPattern, kbDetailPattern, kbMarkdownPath, kbPath } from './routes';

export const kbPublicSurfaceSlice = {
  owner: {
    id: 'kb',
    label: 'База знаний',
    entryPath: kbPath()
  },
  surfaces: [
    {
      id: 'kb:index',
      label: 'База знаний',
      path: kbPath(),
      mediaType: 'text/html',
      cacheClass: 'html',
      discoveryRoles: ['section-entry'],
      catalogRole: 'anchor'
    },
    {
      id: 'kb:index-markdown',
      label: 'Markdown-версия базы знаний',
      path: kbMarkdownPath(),
      mediaType: 'text/markdown',
      cacheClass: 'markdown',
      discoveryRoles: ['markdown-companion'],
      catalogRole: 'item'
    },
    {
      id: 'kb:page',
      label: 'Страница базы знаний',
      routePattern: kbDetailPattern(),
      mediaType: 'text/html',
      cacheClass: 'html',
      discoveryRoles: ['detail-page']
    },
    {
      id: 'kb:page-markdown',
      label: 'Markdown-версия страницы базы знаний',
      routePattern: kbDetailMarkdownPattern(),
      mediaType: 'text/markdown',
      cacheClass: 'markdown',
      discoveryRoles: ['markdown-companion']
    }
  ]
} satisfies PublicSurfaceSlice;
