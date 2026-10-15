import { beforeAll, describe, expect, it } from 'vitest';

import type { KbPage } from '../types';

let kbPageSchema: typeof import('../seo').kbPageSchema;
let kbPageDescription: typeof import('../seo').kbPageDescription;

beforeAll(async () => {
  Object.assign(import.meta.env, {
    SITE: 'https://example.com',
    BASE_URL: '/'
  });

  ({ kbPageSchema, kbPageDescription } = await import('../seo'));
});

const rootPage: KbPage = {
  title: 'База знаний',
  flags: [],
  url: '/kb/',
  canonical: 'https://example.com/kb/',
  isSection: true,
  body: '',
  mentions: []
};

describe('kb schema', () => {
  it('extracts a readable description when an editorial block comes first', () => {
    expect(
      kbPageDescription({
        ...rootPage,
        routeSlug: 'test',
        body: '> [!NOTE]\n> **Условия**\n>\n> Сначала сверьте сведения в документе.\n>\n> [!SOURCE]\n> Основание приведено в справке.'
      })
    ).toMatchInlineSnapshot(
      `"Условия Сначала сверьте сведения в документе. Основание приведено в справке."`
    );
  });
  it('describes the root page without an automatically generated item list', () => {
    const schema = kbPageSchema({
      page: rootPage,
      breadcrumbs: [{ label: 'Главная', href: '/' }, { label: 'База знаний' }],
      description: 'Справочные материалы.'
    });

    expect(schema.map((document) => document['@type'])).toMatchInlineSnapshot(`
      [
        "CollectionPage",
        "BreadcrumbList",
      ]
    `);
    expect(schema[0]?.mainEntity).toBeUndefined();
  });
});
