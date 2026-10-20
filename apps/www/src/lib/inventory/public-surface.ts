import type { PublicSurfaceSlice } from '@/lib/public-surface/types';

import {
  inventoryPath,
  inventoryMarkdownPath,
  inventoryGroupPattern,
  inventoryGroupMarkdownPattern,
  inventoryKindPattern,
  inventoryKindMarkdownPattern,
  inventoryOfferPattern,
  inventoryOfferMarkdownPattern
} from './routes';

export const inventoryPublicSurfaceSlice = {
  owner: { id: 'inventory', label: 'У кого есть', entryPath: inventoryPath() },
  surfaces: [
    {
      id: 'inventory:index',
      label: 'У кого есть',
      path: inventoryPath(),
      mediaType: 'text/html',
      cacheClass: 'html',
      discoveryRoles: ['section-entry'],
      catalogRole: 'anchor',
      acceptsNegotiation: 'required',
      linkRelations: [
        { rel: 'alternate', href: inventoryMarkdownPath(), mediaType: 'text/markdown' },
        { rel: 'describedby', href: '/llms.txt', mediaType: 'text/plain' }
      ]
    },
    {
      id: 'inventory:index-markdown',
      label: 'Markdown-каталог инвентаря',
      path: inventoryMarkdownPath(),
      mediaType: 'text/markdown',
      cacheClass: 'markdown',
      discoveryRoles: ['markdown-companion'],
      catalogRole: 'item',
      linkRelations: [{ rel: 'describedby', href: '/llms.txt', mediaType: 'text/plain' }]
    },
    {
      id: 'inventory:group',
      label: 'Группа инвентаря',
      routePattern: inventoryGroupPattern(),
      mediaType: 'text/html',
      cacheClass: 'html',
      discoveryRoles: ['detail-page'],
      acceptsNegotiation: 'required',
      linkRelations: [
        { rel: 'alternate', href: inventoryGroupMarkdownPattern(), mediaType: 'text/markdown' },
        { rel: 'describedby', href: '/llms.txt', mediaType: 'text/plain' }
      ]
    },
    {
      id: 'inventory:group-markdown',
      label: 'Markdown группы инвентаря',
      routePattern: inventoryGroupMarkdownPattern(),
      mediaType: 'text/markdown',
      cacheClass: 'markdown',
      discoveryRoles: ['markdown-companion'],
      linkRelations: [{ rel: 'describedby', href: '/llms.txt', mediaType: 'text/plain' }]
    },
    {
      id: 'inventory:kind',
      label: 'Вид инвентаря',
      routePattern: inventoryKindPattern(),
      mediaType: 'text/html',
      cacheClass: 'html',
      discoveryRoles: ['detail-page'],
      acceptsNegotiation: 'required',
      linkRelations: [
        { rel: 'alternate', href: inventoryKindMarkdownPattern(), mediaType: 'text/markdown' },
        { rel: 'describedby', href: '/llms.txt', mediaType: 'text/plain' }
      ]
    },
    {
      id: 'inventory:kind-markdown',
      label: 'Markdown вида инвентаря',
      routePattern: inventoryKindMarkdownPattern(),
      mediaType: 'text/markdown',
      cacheClass: 'markdown',
      discoveryRoles: ['markdown-companion'],
      linkRelations: [{ rel: 'describedby', href: '/llms.txt', mediaType: 'text/plain' }]
    },
    {
      id: 'inventory:offer',
      label: 'Предложение инвентаря',
      routePattern: inventoryOfferPattern(),
      mediaType: 'text/html',
      cacheClass: 'html',
      discoveryRoles: ['detail-page'],
      acceptsNegotiation: 'required',
      linkRelations: [
        { rel: 'alternate', href: inventoryOfferMarkdownPattern(), mediaType: 'text/markdown' },
        { rel: 'describedby', href: '/llms.txt', mediaType: 'text/plain' }
      ]
    },
    {
      id: 'inventory:offer-markdown',
      label: 'Markdown предложения инвентаря',
      routePattern: inventoryOfferMarkdownPattern(),
      mediaType: 'text/markdown',
      cacheClass: 'markdown',
      discoveryRoles: ['markdown-companion'],
      linkRelations: [{ rel: 'describedby', href: '/llms.txt', mediaType: 'text/plain' }]
    }
  ]
} satisfies PublicSurfaceSlice;
