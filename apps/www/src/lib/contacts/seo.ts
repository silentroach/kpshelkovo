import type { SchemaDoc } from '@shelkovo/seo';

import { absoluteUrl } from '@/lib/site';

import type { Contact } from './types';
import { contactExcerpt, formatContactCategory } from './view';

const CONTEXT = 'https://schema.org';
const LANG = 'ru-RU';

interface BreadcrumbLink {
  readonly name: string;
  readonly url: string;
}

interface ListEntry {
  readonly name: string;
  readonly url: string;
}

interface ContactsCollectionPageInput {
  readonly name: string;
  readonly description: string;
  readonly url: string;
  readonly items: readonly ListEntry[];
  readonly breadcrumbs?: readonly BreadcrumbLink[];
}

interface ContactPageInput {
  readonly contact: Contact;
  readonly description: string;
  readonly breadcrumbs?: readonly BreadcrumbLink[];
}

const breadcrumbSchema = (items: readonly BreadcrumbLink[]): SchemaDoc => ({
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
    item: absoluteUrl(item.url),
  })),
});

const externalContactUrls = (contact: Contact): readonly string[] =>
  [
    contact.contacts.telegram,
    contact.contacts.whatsapp,
    contact.contacts.website,
  ].filter((url): url is string => Boolean(url));

const contactPointSchema = (contact: Contact, url: string): SchemaDoc => {
  const sameAs = externalContactUrls(contact);

  const schema: SchemaDoc = {
    '@context': CONTEXT,
    '@type': 'ContactPoint',
    '@id': `${url}#contact`,
    name: contact.title,
    description: contactExcerpt(contact),
    contactType: formatContactCategory(contact.category),
    areaServed: {
      '@type': 'Place',
      name: 'Шелково',
    },
    availableLanguage: LANG,
    url,
  };

  if (contact.contacts.phone) {
    schema.telephone = contact.contacts.phone;
  }

  if (contact.contacts.email) {
    schema.email = contact.contacts.email;
  }

  if (sameAs.length > 0) {
    schema.sameAs = sameAs;
  }

  return schema;
};

export const contactsCollectionPageSchema = (
  input: ContactsCollectionPageInput,
): readonly SchemaDoc[] => {
  const url = absoluteUrl(input.url);
  const list = input.items.length
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

  if (list) docs.push(list);
  if (input.breadcrumbs?.length) docs.push(breadcrumbSchema(input.breadcrumbs));

  return docs;
};

export const contactPageSchema = (
  input: ContactPageInput,
): readonly SchemaDoc[] => {
  const { contact } = input;
  const url = absoluteUrl(contact.url);
  const contactPoint = contactPointSchema(contact, url);
  const docs: SchemaDoc[] = [
    {
      '@context': CONTEXT,
      '@type': 'ContactPage',
      name: contact.title,
      description: input.description,
      url,
      inLanguage: LANG,
      mainEntity: {
        '@id': contactPoint['@id'],
      },
      about: {
        '@id': contactPoint['@id'],
      },
      dateModified: contact.updatedIso,
    },
    contactPoint,
  ];

  if (input.breadcrumbs?.length) docs.push(breadcrumbSchema(input.breadcrumbs));

  return docs;
};
