import type { SchemaDoc } from '@shelkovo/seo';

import { absoluteUrl } from '@/lib/site';

import type {
  BreadcrumbLink,
  CollectionPageInput,
  ListEntry,
} from './json-ld-types';

const CONTEXT = 'https://schema.org';
const LANG = 'ru-RU';

export const breadcrumbListSchema = (
  items: readonly BreadcrumbLink[],
): SchemaDoc => ({
  '@context': CONTEXT,
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: absoluteUrl(item.url),
  })),
});

const itemListSchema = (
  url: string,
  items: readonly ListEntry[],
): SchemaDoc => ({
  '@context': CONTEXT,
  '@type': 'ItemList',
  '@id': `${url}#items`,
  url,
  numberOfItems: items.length,
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: item.url ? absoluteUrl(item.url) : undefined,
  })),
});

export const collectionPageSchema = (
  input: CollectionPageInput,
): readonly SchemaDoc[] => {
  const url = absoluteUrl(input.url);
  const list = input.items?.length
    ? itemListSchema(url, input.items)
    : undefined;
  const docs: SchemaDoc[] = [
    {
      '@context': CONTEXT,
      '@type': 'CollectionPage',
      name: input.name,
      description: input.description,
      url,
      inLanguage: LANG,
      ...(list ? { mainEntity: { '@id': list['@id'] } } : {}),
    },
  ];

  if (list) {
    docs.push(list);
  }

  if (input.breadcrumbs?.length) {
    docs.push(breadcrumbListSchema(input.breadcrumbs));
  }

  return docs;
};
