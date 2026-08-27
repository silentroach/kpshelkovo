import type { SchemaDoc } from '@shelkovo/seo';

import { breadcrumbListSchema, collectionPageSchema } from '@/lib/json-ld';
import type { BreadcrumbLink } from '@/lib/json-ld-types';
import { absoluteUrl } from '@/lib/site';

import type { Contact } from './types';
import { contactExcerpt, formatContactCategory } from './view';

const CONTEXT = 'https://schema.org';
const LANG = 'ru-RU';

interface ContactListEntry {
  readonly name: string;
  readonly url: string;
}

interface ContactsCollectionPageInput {
  readonly name: string;
  readonly description: string;
  readonly url: string;
  readonly items: readonly ContactListEntry[];
  readonly breadcrumbs?: readonly BreadcrumbLink[];
}

interface ContactPageInput {
  readonly contact: Contact;
  readonly description: string;
  readonly breadcrumbs?: readonly BreadcrumbLink[];
}

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
): readonly SchemaDoc[] => collectionPageSchema(input);

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

  if (input.breadcrumbs?.length) {
    docs.push(breadcrumbListSchema(input.breadcrumbs));
  }

  return docs;
};
