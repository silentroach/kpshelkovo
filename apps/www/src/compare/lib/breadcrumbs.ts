import type { SchemaDoc } from '@shelkovo/seo';

import type { BreadcrumbItem } from '@/lib/breadcrumbs';
import { breadcrumbListSchema } from '@/lib/json-ld';
import type { BreadcrumbLink } from '@/lib/json-ld-types';

import { withBase } from './url';

const HOME_LABEL = 'Главная';
const COMPARE_LABEL = 'Сравнение тарифов';

export const compareBreadcrumbs = () =>
  [
    { label: HOME_LABEL, href: '/' },
    { label: COMPARE_LABEL, href: withBase('/') },
  ] as const;

export const comparePageBreadcrumbs = (label: string, path: string) =>
  [...compareBreadcrumbs(), { label, href: withBase(path) }] as const;

export const settlementBreadcrumbs = (name: string, slug: string) =>
  comparePageBreadcrumbs(name, `/settlements/${slug}/`);

const schemaBreadcrumb = (item: Required<BreadcrumbItem>): BreadcrumbLink => ({
  name: item.label,
  url: item.href,
});

export const compareBreadcrumbSchema = (
  items: readonly Required<BreadcrumbItem>[],
): SchemaDoc => breadcrumbListSchema(items.map(schemaBreadcrumb));
