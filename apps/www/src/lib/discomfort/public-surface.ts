import type { PublicSurfaceSlice } from '@/lib/public-surface/types';

import { discomfortMarkdownPath, discomfortPath } from './routes';

export const discomfortPublicSurfaceSlice = {
  owner: {
    id: 'discomfort',
    label: 'ОК Дискомфорт',
    entryPath: discomfortPath(),
  },
  surfaces: [
    {
      id: 'discomfort:index',
      label: 'ОК Дискомфорт',
      path: discomfortPath(),
      mediaType: 'text/html',
      cacheClass: 'html',
      discoveryRoles: ['section-entry'],
      catalogRole: 'anchor',
    },
    {
      id: 'discomfort:index-markdown',
      label: 'Markdown-версия раздела «ОК Дискомфорт»',
      path: discomfortMarkdownPath(),
      mediaType: 'text/markdown',
      cacheClass: 'markdown',
      discoveryRoles: ['markdown-companion'],
      catalogRole: 'item',
    },
  ],
} satisfies PublicSurfaceSlice;
