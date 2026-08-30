import { serializeSchema } from '@shelkovo/seo';
import { beforeAll, describe, expect, it } from 'vitest';

import type { BreadcrumbItem } from '@/lib/breadcrumbs';

const SITE = 'https://kpshelkovo.online';
const FIXTURE_LABEL = 'Fixture';

let compareBreadcrumbs: typeof import('./breadcrumbs').compareBreadcrumbs;
let compareBreadcrumbSchema: typeof import('./breadcrumbs').compareBreadcrumbSchema;
let comparePageBreadcrumbs: typeof import('./breadcrumbs').comparePageBreadcrumbs;
let settlementBreadcrumbs: typeof import('./breadcrumbs').settlementBreadcrumbs;

beforeAll(async () => {
  Object.assign(import.meta.env, {
    SITE,
    BASE_URL: '/',
  });

  ({
    compareBreadcrumbs,
    compareBreadcrumbSchema,
    comparePageBreadcrumbs,
    settlementBreadcrumbs,
  } = await import('./breadcrumbs'));
});

const assertPageContract = (
  breadcrumbs: readonly Required<BreadcrumbItem>[],
) => {
  const schema = compareBreadcrumbSchema(breadcrumbs);
  const [serialized] = serializeSchema(schema);

  if (!serialized) {
    throw new Error('Breadcrumb schema must be serializable');
  }

  const parsed = JSON.parse(serialized) as Record<string, unknown>;
  const items = parsed.itemListElement;

  if (!Array.isArray(items)) {
    throw new Error('Breadcrumb schema must include itemListElement');
  }

  expect(serialized).toBe(JSON.stringify(parsed));
  expect(parsed).toMatchObject({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
  });
  expect(items).toHaveLength(breadcrumbs.length);

  items.forEach((item: Record<string, unknown>, index) => {
    const breadcrumb = breadcrumbs[index];

    if (!breadcrumb) {
      throw new Error(`Missing visible breadcrumb at position ${index + 1}`);
    }

    expect(item).toMatchObject({
      name: breadcrumb.label,
      item: new URL(breadcrumb.href, SITE).toString(),
      position: index + 1,
    });
  });
};

describe('compare breadcrumbs', () => {
  it.each([
    ['index', () => compareBreadcrumbs()],
    ['rating', () => comparePageBreadcrumbs(FIXTURE_LABEL, '/fixture-rating/')],
    [
      'settlement',
      () => settlementBreadcrumbs(FIXTURE_LABEL, 'fixture-settlement'),
    ],
  ])(
    'keeps visible and serialized breadcrumbs aligned on the %s route',
    (_, breadcrumbs) => {
      assertPageContract(breadcrumbs());
    },
  );
});
