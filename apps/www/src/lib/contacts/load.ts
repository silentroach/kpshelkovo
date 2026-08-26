import { getCollection, type CollectionEntry } from 'astro:content';
import { compareRuText } from '@shelkovo/format';

import type { SiteMentionRegistry } from '@/lib/mentions';
import { loadSiteMentionRegistry } from '@/lib/mentions/registry';

import { mapRawContact } from './mapper';
import type { RawContact } from './raw-schema';
import { CONTACT_CATEGORIES, isContactCategory, isContactSlug } from './schema';
import type { Contact, ContactsDataset, ContactWithVcf } from './types';
import {
  contactCategoryMarkdownUrl,
  contactCategoryUrl,
  contactRouteKey,
} from './routes';
import { formatContactCategory } from './view';

export type ContactEntry = Pick<CollectionEntry<'contacts'>, 'id' | 'body'> & {
  readonly data: RawContact;
};

let cache: Promise<ContactsDataset> | undefined;

const compareContacts = (a: Contact, b: Contact): number =>
  compareRuText(
    formatContactCategory(a.category),
    formatContactCategory(b.category),
  ) ||
  compareRuText(a.title, b.title) ||
  compareRuText(a.slug, b.slug);

const validateUniqueRoutes = (contacts: readonly Contact[]): void => {
  const seen = new Set<string>();

  for (const contact of contacts) {
    const key = contactRouteKey(contact);

    if (seen.has(key)) {
      throw new Error(`duplicate contact route "${key}"`);
    }

    seen.add(key);
  }
};

const buildCategoryPages = (contacts: readonly Contact[]) =>
  CONTACT_CATEGORIES.map((category) => ({
    category,
    contacts: contacts.filter((contact) => contact.category === category),
    url: contactCategoryUrl({ category }),
    markdownUrl: contactCategoryMarkdownUrl({ category }),
  })).filter((category) => category.contacts.length > 0);

export const buildContactsDataset = (
  entries: readonly ContactEntry[],
  opts?: {
    readonly mentionRegistry?: SiteMentionRegistry;
  },
): ContactsDataset => {
  const mentionRegistry = opts?.mentionRegistry;
  const contacts = entries
    .map((entry) => mapRawContact(entry, mentionRegistry))
    .sort(compareContacts);

  validateUniqueRoutes(contacts);

  const categories = buildCategoryPages(contacts);

  return {
    contacts,
    categories,
    byRoute: new Map(
      contacts.map((contact) => [contactRouteKey(contact), contact] as const),
    ),
    byCategory: new Map(
      categories.map((category) => [category.category, category] as const),
    ),
  };
};

const buildContactsData = async (): Promise<ContactsDataset> =>
  buildContactsDataset(await getCollection('contacts'), {
    mentionRegistry: await loadSiteMentionRegistry(),
  });

export const loadContactsData = (): Promise<ContactsDataset> => {
  cache ??= buildContactsData();

  return cache;
};

export const loadContacts = async (): Promise<readonly Contact[]> =>
  (await loadContactsData()).contacts;

export const hasContactVcf = (contact: Contact): contact is ContactWithVcf =>
  Boolean(contact.vcf);

export const loadContactsWithVcf = async (): Promise<
  readonly ContactWithVcf[]
> => (await loadContacts()).filter(hasContactVcf);

export const loadContactCategories = async (): Promise<
  ContactsDataset['categories']
> => (await loadContactsData()).categories;

export const loadContactCategory = async (category: string) => {
  const key = category.trim();

  return isContactCategory(key)
    ? (await loadContactsData()).byCategory.get(key)
    : undefined;
};

export const loadContact = async (
  category: string,
  slug: string,
): Promise<Contact | undefined> => {
  const categoryKey = category.trim();
  const slugKey = slug.trim();

  if (!isContactCategory(categoryKey) || !isContactSlug(slugKey)) {
    return;
  }

  return (await loadContactsData()).byRoute.get(
    contactRouteKey({ category: categoryKey, slug: slugKey }),
  );
};

export const loadContactWithVcf = async (
  category: string,
  slug: string,
): Promise<ContactWithVcf | undefined> => {
  const contact = await loadContact(category, slug);

  return contact && hasContactVcf(contact) ? contact : undefined;
};
