import type { PublicSurfaceSlice } from '@/lib/public-surface/types';

import {
  placeMarkdownPattern,
  placePattern,
  placesDataPath,
  placesMarkdownPath,
  placesPath,
} from './routes';

export const placesPublicSurfaceSlice = {
  owner: {
    id: 'places',
    label: 'Карта',
    entryPath: placesPath(),
  },
  surfaces: [
    {
      id: 'places:index',
      label: 'Карта мест и объектов Шелково',
      path: placesPath(),
      mediaType: 'text/html',
      cacheClass: 'html',
      discoveryRoles: ['section-entry'],
      catalogRole: 'anchor',
    },
    {
      id: 'places:index-markdown',
      label: 'Markdown-версия карты мест',
      path: placesMarkdownPath(),
      mediaType: 'text/markdown',
      cacheClass: 'markdown',
      discoveryRoles: ['markdown-companion'],
      catalogRole: 'item',
    },
    {
      id: 'places:data',
      label: 'Облегчённые данные интерактивной карты',
      path: placesDataPath(),
      mediaType: 'application/json',
      cacheClass: 'data',
      discoveryRoles: ['data-feed'],
      catalogRole: 'item',
    },
    {
      id: 'places:detail',
      label: 'Карточка места',
      routePattern: placePattern(),
      mediaType: 'text/html',
      cacheClass: 'html',
      discoveryRoles: ['detail-page'],
    },
    {
      id: 'places:detail-markdown',
      label: 'Markdown-версия карточки места',
      routePattern: placeMarkdownPattern(),
      mediaType: 'text/markdown',
      cacheClass: 'markdown',
      discoveryRoles: ['markdown-companion'],
    },
  ],
} satisfies PublicSurfaceSlice;
