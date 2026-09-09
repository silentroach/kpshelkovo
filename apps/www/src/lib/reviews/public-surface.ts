import type { PublicSurfaceSlice } from '@/lib/public-surface/types';

import {
  reviewMarkdownPattern,
  reviewPattern,
  reviewsMarkdownPath,
  reviewsPath,
  reviewsRulesMarkdownPath,
  reviewsRulesPath
} from './routes';

export const reviewsPublicSurfaceSlice = {
  owner: {
    id: 'reviews',
    label: 'Отзывы',
    entryPath: reviewsPath()
  },
  surfaces: [
    {
      id: 'reviews:index',
      label: 'Отзывы собственников',
      path: reviewsPath(),
      mediaType: 'text/html',
      cacheClass: 'html',
      discoveryRoles: ['section-entry'],
      catalogRole: 'anchor'
    },
    {
      id: 'reviews:index-markdown',
      label: 'Markdown-версия отзывов собственников',
      path: reviewsMarkdownPath(),
      mediaType: 'text/markdown',
      cacheClass: 'markdown',
      discoveryRoles: ['markdown-companion'],
      catalogRole: 'item'
    },
    {
      id: 'reviews:rules',
      label: 'Правила публикации отзывов',
      path: reviewsRulesPath(),
      mediaType: 'text/html',
      cacheClass: 'html',
      discoveryRoles: ['detail-page']
    },
    {
      id: 'reviews:rules-markdown',
      label: 'Markdown-версия правил публикации отзывов',
      path: reviewsRulesMarkdownPath(),
      mediaType: 'text/markdown',
      cacheClass: 'markdown',
      discoveryRoles: ['markdown-companion']
    },
    {
      id: 'reviews:review',
      label: 'Страница отзыва собственника',
      routePattern: reviewPattern(),
      mediaType: 'text/html',
      cacheClass: 'html',
      discoveryRoles: ['detail-page']
    },
    {
      id: 'reviews:review-markdown',
      label: 'Markdown-версия отзыва собственника',
      routePattern: reviewMarkdownPattern(),
      mediaType: 'text/markdown',
      cacheClass: 'markdown',
      discoveryRoles: ['markdown-companion']
    }
  ]
} satisfies PublicSurfaceSlice;
