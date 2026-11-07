import type { BreadcrumbItem } from '@/lib/breadcrumbs';
import type { BreadcrumbLink } from '@/lib/json-ld-types';
import { withBase } from '@/lib/site';

import { tariffTldrUrl } from './routes';

export const tariffBreadcrumbs = () =>
  [
    { label: 'Главная', href: withBase('/') },
    { label: 'Тариф 815', href: tariffTldrUrl() }
  ] as const;

export const tariffSchemaBreadcrumbs = (
  items: readonly Required<BreadcrumbItem>[]
): readonly BreadcrumbLink[] => items.map((item) => ({ name: item.label, url: item.href }));
