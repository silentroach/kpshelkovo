import { serializeSchema } from '@shelkovo/seo';
import { beforeAll, describe, expect, expectTypeOf, it } from 'vitest';

import type { ListEntry } from '@/lib/json-ld-types';

let collectionPageSchema: typeof import('../json-ld').collectionPageSchema;

beforeAll(async () => {
  Object.assign(import.meta.env, {
    SITE: 'https://example.com',
    BASE_URL: '/',
  });

  ({ collectionPageSchema } = await import('../json-ld'));
});

describe('shared JSON-LD schemas', () => {
  it('builds the ordered collection graph with absolute URLs', () => {
    const schema = collectionPageSchema({
      name: 'Раздел',
      description: 'Описание раздела.',
      url: '/section/',
      items: [{ name: 'Первый', url: '/section/first/' }, { name: 'Второй' }],
      breadcrumbs: [
        { name: 'Главная', url: '/' },
        { name: 'Раздел', url: '/section/' },
      ],
    });

    expect(serializeSchema(schema)).toMatchInlineSnapshot(`
      [
        "{\"@context\":\"https://schema.org\",\"@type\":\"CollectionPage\",\"name\":\"Раздел\",\"description\":\"Описание раздела.\",\"url\":\"https://example.com/section/\",\"inLanguage\":\"ru-RU\",\"mainEntity\":{\"@id\":\"https://example.com/section/#items\"}}",
        "{\"@context\":\"https://schema.org\",\"@type\":\"ItemList\",\"@id\":\"https://example.com/section/#items\",\"url\":\"https://example.com/section/\",\"numberOfItems\":2,\"itemListElement\":[{\"@type\":\"ListItem\",\"position\":1,\"name\":\"Первый\",\"item\":\"https://example.com/section/first/\"},{\"@type\":\"ListItem\",\"position\":2,\"name\":\"Второй\"}]}",
        "{\"@context\":\"https://schema.org\",\"@type\":\"BreadcrumbList\",\"itemListElement\":[{\"@type\":\"ListItem\",\"position\":1,\"name\":\"Главная\",\"item\":\"https://example.com/\"},{\"@type\":\"ListItem\",\"position\":2,\"name\":\"Раздел\",\"item\":\"https://example.com/section/\"}]}",
      ]
    `);
  });

  it('keeps list item URLs optional and omits an empty list', () => {
    expectTypeOf<{ readonly name: string }>().toMatchTypeOf<ListEntry>();

    expect(
      serializeSchema(
        collectionPageSchema({
          name: 'Пустой раздел',
          description: 'Пока без элементов.',
          url: '/empty/',
          items: [],
          breadcrumbs: [],
        }),
      ),
    ).toMatchInlineSnapshot(`
      [
        "{\"@context\":\"https://schema.org\",\"@type\":\"CollectionPage\",\"name\":\"Пустой раздел\",\"description\":\"Пока без элементов.\",\"url\":\"https://example.com/empty/\",\"inLanguage\":\"ru-RU\"}",
      ]
    `);
  });
});
