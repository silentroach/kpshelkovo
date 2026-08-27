import type { BreadcrumbLink } from '@/lib/json-ld-types';

import { withBase } from './site';

export interface BreadcrumbItem {
  readonly label: string;
  readonly href?: string;
}

const HOME_LABEL = 'Главная';
const HOME_URL = withBase('/');

const HOME_BREADCRUMB: BreadcrumbItem = {
  label: HOME_LABEL,
  href: HOME_URL,
};

const HOME_SCHEMA_BREADCRUMB: BreadcrumbLink = {
  name: HOME_LABEL,
  url: HOME_URL,
};

export const withHomeBreadcrumbs = (
  items: readonly BreadcrumbItem[],
): readonly BreadcrumbItem[] => [HOME_BREADCRUMB, ...items];

export const withHomeSchemaBreadcrumbs = (
  items: readonly BreadcrumbLink[],
): readonly BreadcrumbLink[] => [HOME_SCHEMA_BREADCRUMB, ...items];
