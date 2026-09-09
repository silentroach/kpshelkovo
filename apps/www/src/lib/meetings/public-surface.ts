import type { PublicSurfaceSlice } from '@/lib/public-surface/types';

import {
  meetingMarkdownPattern,
  meetingPattern,
  meetingsMarkdownPath,
  meetingTranscriptPartMarkdownPattern
} from './routes';

export const meetingsPublicSurfaceSlice = {
  owner: {
    id: 'meetings',
    label: 'Архив встреч',
    entryPath: meetingsMarkdownPath()
  },
  surfaces: [
    {
      id: 'meetings:index-markdown',
      label: 'Markdown-индекс архива встреч без публичного HTML-индекса',
      path: meetingsMarkdownPath(),
      mediaType: 'text/markdown',
      cacheClass: 'markdown',
      discoveryRoles: ['section-entry', 'markdown-companion'],
      catalogRole: 'anchor'
    },
    {
      id: 'meetings:detail',
      label: 'Страница транскрипции встречи',
      routePattern: meetingPattern(),
      mediaType: 'text/html',
      cacheClass: 'html',
      discoveryRoles: ['detail-page']
    },
    {
      id: 'meetings:detail-markdown',
      label: 'Markdown-описание встречи',
      routePattern: meetingMarkdownPattern(),
      mediaType: 'text/markdown',
      cacheClass: 'markdown',
      discoveryRoles: ['markdown-companion']
    },
    {
      id: 'meetings:transcript-part-markdown',
      label: 'Markdown-транскрипт части встречи',
      routePattern: meetingTranscriptPartMarkdownPattern(),
      mediaType: 'text/markdown',
      cacheClass: 'markdown',
      discoveryRoles: ['markdown-companion']
    }
  ]
} satisfies PublicSurfaceSlice;
