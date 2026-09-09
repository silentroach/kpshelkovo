import { type BreadcrumbItem, withHomeBreadcrumbs } from '@/lib/breadcrumbs';

import { kbUrl } from './routes';
import type { KbPage } from './types';

const KB_TITLE = 'База знаний';

const pagesByRouteSlug = (pages: readonly KbPage[]): ReadonlyMap<string, KbPage> => {
  const result = new Map<string, KbPage>();

  for (const page of pages) {
    if (page.routeSlug) {
      result.set(page.routeSlug, page);
    }
  }

  return result;
};

const parentRouteSlugs = (routeSlug: string): readonly string[] => {
  const segments = routeSlug.split('/');

  return segments.slice(0, -1).map((_, index) => segments.slice(0, index + 1).join('/'));
};

export const kbBreadcrumbs = (
  page: KbPage,
  pages: readonly KbPage[]
): readonly BreadcrumbItem[] => {
  if (!page.routeSlug) {
    return withHomeBreadcrumbs([{ label: KB_TITLE }]);
  }

  const breadcrumbs: BreadcrumbItem[] = [{ label: KB_TITLE, href: kbUrl() }];
  const byRouteSlug = pagesByRouteSlug(pages);

  for (const routeSlug of parentRouteSlugs(page.routeSlug)) {
    const parent = byRouteSlug.get(routeSlug);

    if (parent) {
      breadcrumbs.push({ label: parent.title, href: parent.url });
    }
  }

  breadcrumbs.push({ label: page.title });

  return withHomeBreadcrumbs(breadcrumbs);
};
