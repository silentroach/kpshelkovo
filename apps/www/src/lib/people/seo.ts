import type { SchemaDoc } from '@shelkovo/seo';

import { breadcrumbListSchema } from '@/lib/json-ld';
import type { BreadcrumbLink } from '@/lib/json-ld-types';

import { absoluteUrl } from '../site';
import type { PersonContact } from './types';

const CONTEXT = 'https://schema.org';
const LANG = 'ru-RU';

interface PersonProfilePageInput {
  readonly name: string;
  readonly description: string;
  readonly company?: string;
  readonly position?: string;
  readonly url: string;
  readonly contacts: readonly PersonContact[];
  readonly breadcrumbs?: readonly BreadcrumbLink[];
}

const personEntity = (input: PersonProfilePageInput): SchemaDoc => {
  const url = absoluteUrl(input.url);
  const telephones = input.contacts
    .filter((contact) => contact.type === 'phone')
    .map((contact) => contact.value);
  const sameAs = input.contacts
    .filter((contact) => contact.type === 'telegram')
    .map((contact) => absoluteUrl(contact.href));

  return {
    '@context': CONTEXT,
    '@type': 'Person',
    '@id': `${url}#person`,
    name: input.name,
    description: input.description,
    url,
    mainEntityOfPage: url,
    ...(input.position ? { jobTitle: input.position } : {}),
    ...(input.company
      ? {
          worksFor: {
            '@type': 'Organization',
            name: input.company,
          },
        }
      : {}),
    ...(telephones.length === 1
      ? { telephone: telephones[0] }
      : telephones.length > 1
        ? { telephone: telephones }
        : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };
};

export const personProfilePageSchema = (
  input: PersonProfilePageInput,
): readonly SchemaDoc[] => {
  const url = absoluteUrl(input.url);

  const docs: SchemaDoc[] = [
    {
      '@context': CONTEXT,
      '@type': 'ProfilePage',
      name: input.name,
      description: input.description,
      url,
      inLanguage: LANG,
      mainEntity: {
        '@id': `${url}#person`,
      },
    },
    personEntity(input),
  ];

  if (input.breadcrumbs?.length) {
    docs.push(breadcrumbListSchema(input.breadcrumbs));
  }

  return docs;
};
