import { serializeSchema } from '@shelkovo/seo';
import { beforeAll, describe, expect, it } from 'vitest';

import type { BreadcrumbItem } from '@/lib/breadcrumbs';

let compareBreadcrumbs: typeof import('./breadcrumbs').compareBreadcrumbs;
let compareBreadcrumbSchema: typeof import('./breadcrumbs').compareBreadcrumbSchema;
let comparePageBreadcrumbs: typeof import('./breadcrumbs').comparePageBreadcrumbs;
let settlementBreadcrumbs: typeof import('./breadcrumbs').settlementBreadcrumbs;

beforeAll(async () => {
  Object.assign(import.meta.env, {
    SITE: 'https://kpshelkovo.online',
    BASE_URL: '/',
  });

  ({
    compareBreadcrumbs,
    compareBreadcrumbSchema,
    comparePageBreadcrumbs,
    settlementBreadcrumbs,
  } = await import('./breadcrumbs'));
});

const pageContract = (breadcrumbs: readonly Required<BreadcrumbItem>[]) => {
  const schema = compareBreadcrumbSchema(breadcrumbs);
  const items = schema.itemListElement;

  if (!Array.isArray(items)) {
    throw new Error('Breadcrumb schema must include itemListElement');
  }

  expect(
    (items as readonly Record<string, unknown>[]).map((item) => item.name),
  ).toEqual(breadcrumbs.map((item) => item.label));

  return {
    visible: breadcrumbs,
    jsonLd: serializeSchema(schema)[0],
  };
};

describe('compare breadcrumbs', () => {
  it('keeps visible and serialized breadcrumbs aligned on every compare route', () => {
    expect({
      index: pageContract(compareBreadcrumbs()),
      rating: pageContract(
        comparePageBreadcrumbs('Как считается уровень', '/rating/'),
      ),
      settlement: pageContract(settlementBreadcrumbs('КП Шелково', 'shelkovo')),
    }).toMatchInlineSnapshot(`
      {
        "index": {
          "jsonLd": "{\"@context\":\"https://schema.org\",\"@type\":\"BreadcrumbList\",\"itemListElement\":[{\"@type\":\"ListItem\",\"position\":1,\"name\":\"Главная\",\"item\":\"https://kpshelkovo.online/\"},{\"@type\":\"ListItem\",\"position\":2,\"name\":\"Сравнение тарифов\",\"item\":\"https://kpshelkovo.online/815/compare/\"}]}",
          "visible": [
            {
              "href": "/",
              "label": "Главная",
            },
            {
              "href": "/815/compare/",
              "label": "Сравнение тарифов",
            },
          ],
        },
        "rating": {
          "jsonLd": "{\"@context\":\"https://schema.org\",\"@type\":\"BreadcrumbList\",\"itemListElement\":[{\"@type\":\"ListItem\",\"position\":1,\"name\":\"Главная\",\"item\":\"https://kpshelkovo.online/\"},{\"@type\":\"ListItem\",\"position\":2,\"name\":\"Сравнение тарифов\",\"item\":\"https://kpshelkovo.online/815/compare/\"},{\"@type\":\"ListItem\",\"position\":3,\"name\":\"Как считается уровень\",\"item\":\"https://kpshelkovo.online/815/compare/rating/\"}]}",
          "visible": [
            {
              "href": "/",
              "label": "Главная",
            },
            {
              "href": "/815/compare/",
              "label": "Сравнение тарифов",
            },
            {
              "href": "/815/compare/rating/",
              "label": "Как считается уровень",
            },
          ],
        },
        "settlement": {
          "jsonLd": "{\"@context\":\"https://schema.org\",\"@type\":\"BreadcrumbList\",\"itemListElement\":[{\"@type\":\"ListItem\",\"position\":1,\"name\":\"Главная\",\"item\":\"https://kpshelkovo.online/\"},{\"@type\":\"ListItem\",\"position\":2,\"name\":\"Сравнение тарифов\",\"item\":\"https://kpshelkovo.online/815/compare/\"},{\"@type\":\"ListItem\",\"position\":3,\"name\":\"КП Шелково\",\"item\":\"https://kpshelkovo.online/815/compare/settlements/shelkovo/\"}]}",
          "visible": [
            {
              "href": "/",
              "label": "Главная",
            },
            {
              "href": "/815/compare/",
              "label": "Сравнение тарифов",
            },
            {
              "href": "/815/compare/settlements/shelkovo/",
              "label": "КП Шелково",
            },
          ],
        },
      }
    `);
  });
});
