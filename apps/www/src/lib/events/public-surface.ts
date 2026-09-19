import type { PublicSurfaceSlice } from '@/lib/public-surface/types';

import { eventCalendarUrl, eventDayUrl, eventMonthUrl } from './urls';

export const eventsPublicSurfaceSlice = {
  owner: { id: 'events', label: 'События', entryPath: '/events/' },
  surfaces: [
    {
      id: 'events:index',
      label: 'Календарь мероприятий',
      path: '/events/',
      mediaType: 'text/html',
      cacheClass: 'html',
      discoveryRoles: ['section-entry'],
      catalogRole: 'anchor',
      acceptsNegotiation: 'required',
      linkRelations: [
        { rel: 'alternate', href: '/events/index.md', mediaType: 'text/markdown' },
        { rel: 'describedby', href: '/llms.txt', mediaType: 'text/plain' }
      ]
    },
    {
      id: 'events:index-markdown',
      label: 'Markdown-индекс мероприятий',
      path: '/events/index.md',
      mediaType: 'text/markdown',
      cacheClass: 'markdown',
      discoveryRoles: ['markdown-companion'],
      catalogRole: 'item',
      linkRelations: [{ rel: 'describedby', href: '/llms.txt', mediaType: 'text/plain' }]
    },
    ...[
      { id: 'month', label: 'Календарь месяца', path: eventMonthUrl(':year-:month') },
      { id: 'month-list', label: 'Список месяца', path: eventMonthUrl(':year-:month', 'list') },
      {
        id: 'day',
        label: 'Краткий список мероприятий дня',
        path: eventDayUrl(':year-:month-:day')
      },
      { id: 'detail', label: 'Подробное мероприятие', path: '/events/:year/:month/:slug/' }
    ].flatMap(({ id, label, path }) => [
      {
        id: `events:${id}`,
        label,
        routePattern: path,
        mediaType: 'text/html',
        cacheClass: 'html' as const,
        discoveryRoles: ['detail-page'] as const,
        acceptsNegotiation: 'required' as const,
        linkRelations: [
          { rel: 'alternate', href: `${path}index.md`, mediaType: 'text/markdown' },
          { rel: 'describedby', href: '/llms.txt', mediaType: 'text/plain' }
        ]
      },
      {
        id: `events:${id}-markdown`,
        label: `${label} в Markdown`,
        routePattern: `${path}index.md`,
        mediaType: 'text/markdown',
        cacheClass: 'markdown' as const,
        discoveryRoles: ['markdown-companion'] as const,
        linkRelations: [{ rel: 'describedby', href: '/llms.txt', mediaType: 'text/plain' }]
      }
    ]),
    {
      id: 'events:data',
      label: 'Полная JSON-выдача мероприятий',
      path: '/events/events.json',
      mediaType: 'application/json',
      cacheClass: 'data',
      discoveryRoles: ['data-feed', 'root-catalog'],
      catalogRole: 'item',
      linkRelations: [
        {
          rel: 'describedby',
          href: '/events/schemas/events.schema.json',
          mediaType: 'application/schema+json'
        }
      ]
    },
    {
      id: 'events:schema',
      label: 'JSON Schema мероприятий',
      path: '/events/schemas/events.schema.json',
      mediaType: 'application/schema+json',
      cacheClass: 'schema',
      discoveryRoles: ['schema'],
      catalogRole: 'service-desc'
    },
    {
      id: 'events:calendar',
      label: 'Календарный файл мероприятия',
      routePattern: eventCalendarUrl(':id'),
      mediaType: 'text/calendar',
      cacheClass: 'static',
      discoveryRoles: ['download']
    }
  ]
} satisfies PublicSurfaceSlice;
