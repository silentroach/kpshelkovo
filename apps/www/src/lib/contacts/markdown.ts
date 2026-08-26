import {
  createMarkdownDocument,
  md,
  parseMarkdownFragment,
  serializeMarkdownDocument,
} from '@shelkovo/markdown';
import { count } from '@shelkovo/format';

import { absoluteUrl } from '@/lib/site';

import type {
  Contact,
  ContactCategoryPage,
  ContactsDataset,
  ContactWithDetail,
} from './types';
import {
  CONTACTS_CHAT_LABEL,
  CONTACTS_CHAT_URL,
  CONTACTS_EMPTY_MESSAGE,
  CONTACTS_INTRO_PREFIX,
  CONTACTS_INTRO_SUFFIX,
  CONTACTS_NEIGHBOR_TABLE_LABEL,
  CONTACTS_NEIGHBOR_TABLE_PREFIX,
  CONTACTS_NEIGHBOR_TABLE_SUFFIX,
  CONTACTS_NEIGHBOR_TABLE_URL,
  contactExcerpt,
  formatContactCategory,
} from './view';

type MarkdownNode = ReturnType<typeof parseMarkdownFragment>[number];

type ContactFrontmatterLocation = Exclude<Contact['location'], undefined>;

interface ContactFrontmatterReview {
  readonly sentiment: Contact['reviews'][number]['sentiment'];
  readonly summary: string;
  readonly published_at: string;
  readonly url: string;
}

interface ContactFrontmatter extends Readonly<Record<string, unknown>> {
  readonly title: string;
  readonly slug: string;
  readonly category: string;
  readonly updated_at: string;
  readonly summary?: string;
  readonly contacts: Contact['contacts'];
  readonly location?: ContactFrontmatterLocation;
  readonly reviews?: readonly ContactFrontmatterReview[];
  readonly vcf_url?: string;
}

type MutableContactFrontmatterContacts = {
  -readonly [Key in keyof Contact['contacts']]?: string;
};

type MutableContactFrontmatterLocation = {
  title: string;
  url: string;
  address?: string;
  coordinates?: ContactFrontmatterLocation['coordinates'];
};

type MutableContactFrontmatter = Record<string, unknown> & {
  title: string;
  slug: string;
  category: string;
  updated_at: string;
  summary?: string;
  contacts: Contact['contacts'];
  location?: ContactFrontmatterLocation;
  reviews?: readonly ContactFrontmatterReview[];
  vcf_url?: string;
};

const CONTACT_FRONTMATTER_CONTACT_KEYS = [
  'phone',
  'telegram',
  'whatsapp',
  'email',
  'website',
] as const satisfies readonly (keyof Contact['contacts'])[];

const serialize = (children: readonly MarkdownNode[]): string =>
  serializeMarkdownDocument(createMarkdownDocument({ children }));

const abs = (path: string): string => absoluteUrl(path);

const chatLink = () => md.link(CONTACTS_CHAT_URL, CONTACTS_CHAT_LABEL);

const neighborTableLink = () =>
  md.link(CONTACTS_NEIGHBOR_TABLE_URL, CONTACTS_NEIGHBOR_TABLE_LABEL);

const contactsIntro = (): MarkdownNode =>
  md.paragraph([
    md.text(CONTACTS_INTRO_PREFIX),
    chatLink(),
    md.text(CONTACTS_INTRO_SUFFIX),
    md.text(CONTACTS_NEIGHBOR_TABLE_PREFIX),
    neighborTableLink(),
    md.text(CONTACTS_NEIGHBOR_TABLE_SUFFIX),
  ]);

const contactsEmpty = (): MarkdownNode => md.paragraph(CONTACTS_EMPTY_MESSAGE);

const contactTitle = (contact: Contact) =>
  contact.hasDetailPage
    ? [md.link(abs(contact.markdownUrl), contact.title)]
    : [md.text(contact.title)];

const contactLine = (contact: Contact) => {
  const excerpt = contactExcerpt(contact);

  return md.listItem([
    md.paragraph([
      ...contactTitle(contact),
      ...(excerpt ? [md.text(` — ${excerpt}`)] : []),
    ]),
  ]);
};

const categoryLine = (category: ContactCategoryPage) =>
  md.listItem([
    md.paragraph([
      md.link(
        abs(category.markdownUrl),
        formatContactCategory(category.category),
      ),
      md.text(
        ` — ${count(category.contacts.length, ['контакт', 'контакта', 'контактов'])}`,
      ),
    ]),
  ]);

const contactFrontmatter = (contact: ContactWithDetail): ContactFrontmatter => {
  const frontmatter: MutableContactFrontmatter = {
    title: contact.title,
    slug: contact.slug,
    category: formatContactCategory(contact.category),
    updated_at: contact.updatedIso,
    contacts: contactContactsFrontmatter(contact.contacts),
  };

  if (contact.summary) {
    frontmatter.summary = contact.summary;
  }

  const location = contactLocationFrontmatter(contact.location);

  if (location) {
    frontmatter.location = location;
  }

  if (contact.reviews.length > 0) {
    frontmatter.reviews = contact.reviews.map(contactReviewFrontmatter);
  }

  if (contact.vcf) {
    frontmatter.vcf_url = abs(contact.vcf.downloadUrl);
  }

  return frontmatter;
};

const contactContactsFrontmatter = (
  contacts: Contact['contacts'],
): Contact['contacts'] => {
  const frontmatter: MutableContactFrontmatterContacts = {};

  for (const key of CONTACT_FRONTMATTER_CONTACT_KEYS) {
    const value = contacts[key];

    if (value) {
      frontmatter[key] = value;
    }
  }

  return frontmatter;
};

const contactLocationFrontmatter = (
  location: Contact['location'],
): ContactFrontmatterLocation | undefined => {
  if (!location) {
    return;
  }

  const frontmatter: MutableContactFrontmatterLocation = {
    title: location.title,
    url: location.url,
  };

  if (location.address) {
    frontmatter.address = location.address;
  }

  if (location.coordinates) {
    frontmatter.coordinates = location.coordinates;
  }

  return frontmatter;
};

const contactReviewFrontmatter = (
  review: Contact['reviews'][number],
): ContactFrontmatterReview => ({
  sentiment: review.sentiment,
  summary: review.summary,
  published_at: review.publishedIso,
  url: review.url,
});

export const buildContactsHomeMarkdown = (data: ContactsDataset): string =>
  serialize([
    md.heading(1, 'Сарафан'),
    contactsIntro(),
    md.heading(2, 'Категории'),
    data.categories.length > 0
      ? md.list(data.categories.map(categoryLine))
      : contactsEmpty(),
    ...data.categories.flatMap((category) => [
      md.heading(2, formatContactCategory(category.category)),
      md.list(category.contacts.map(contactLine)),
    ]),
  ]);

export const buildContactsCategoryMarkdown = (
  category: ContactCategoryPage,
): string =>
  serialize([
    md.heading(1, formatContactCategory(category.category)),
    md.heading(2, 'Контакты'),
    md.list(category.contacts.map(contactLine)),
  ]);

export const buildContactMarkdown = (contact: ContactWithDetail): string =>
  serializeMarkdownDocument(
    createMarkdownDocument({
      frontmatter: contactFrontmatter(contact),
      children: [
        md.heading(1, contact.title),
        ...parseMarkdownFragment(contact.body.trim()),
      ],
    }),
  );
