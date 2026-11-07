import type { SchemaDoc } from '@shelkovo/seo';

import type { BreadcrumbItem } from '@/lib/breadcrumbs';
import { breadcrumbListSchema } from '@/lib/json-ld';
import { tariffBreadcrumbs, tariffSchemaBreadcrumbs } from '@/lib/tariff-tldr/breadcrumbs';

import { withBase } from './url';

const COMPARE_LABEL = 'Сравнение тарифов';

export const compareBreadcrumbs = () =>
  [...tariffBreadcrumbs(), { label: COMPARE_LABEL, href: withBase('/') }] as const;

export const comparePageBreadcrumbs = (label: string, path: string) =>
  [...compareBreadcrumbs(), { label, href: withBase(path) }] as const;

export const settlementBreadcrumbs = (name: string, slug: string) =>
  comparePageBreadcrumbs(name, `/settlements/${slug}/`);

export const compareBreadcrumbSchema = (items: readonly Required<BreadcrumbItem>[]): SchemaDoc =>
  breadcrumbListSchema(tariffSchemaBreadcrumbs(items));
