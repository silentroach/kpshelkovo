import { beforeAll, describe, expect, it } from 'vitest';

import type { KbPage } from '../types';

let kbPageSchema: typeof import('../seo').kbPageSchema;

beforeAll(async () => {
  Object.assign(import.meta.env, {
    SITE: 'https://example.com',
    BASE_URL: '/',
  });

  ({ kbPageSchema } = await import('../seo'));
});

const rootPage: KbPage = {
  id: 'index',
  sourceId: 'index',
  title: 'База знаний',
  flags: [],
  url: '/kb/',
  canonical: 'https://example.com/kb/',
  isSection: true,
  body: '',
  mentions: [],
};

describe('kb schema', () => {
  it('describes the root page without an automatically generated item list', () => {
    const schema = kbPageSchema({
      page: rootPage,
      breadcrumbs: [{ label: 'Главная', href: '/' }, { label: 'База знаний' }],
      description: 'Справочные материалы.',
    });

    expect(schema.map((document) => document['@type'])).toMatchInlineSnapshot(`
      [
        "CollectionPage",
        "BreadcrumbList",
      ]
    `);
    expect(schema[0]).not.toHaveProperty('mainEntity');
  });
});
