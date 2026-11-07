import type { PublicSurfaceSlice } from '@/lib/public-surface/types';
import { tariffTldrMarkdownPath, tariffTldrPath } from '@/lib/tariff-tldr/routes';

export const tariffPublicSurfaceSlice = {
  owner: {
    id: 'tariff',
    label: 'Тариф 815',
    entryPath: tariffTldrPath()
  },
  surfaces: [
    {
      id: 'tariff:overview',
      label: 'Вкратце о новом тарифе',
      path: tariffTldrPath(),
      mediaType: 'text/html',
      cacheClass: 'html',
      discoveryRoles: ['section-entry'],
      catalogRole: 'anchor'
    },
    {
      id: 'tariff:overview-markdown',
      label: 'Markdown-версия вводного материала о тарифе',
      path: tariffTldrMarkdownPath(),
      mediaType: 'text/markdown',
      cacheClass: 'markdown',
      discoveryRoles: ['markdown-companion'],
      catalogRole: 'item'
    }
  ]
} satisfies PublicSurfaceSlice;
