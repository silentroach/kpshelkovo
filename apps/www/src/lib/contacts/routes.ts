import { canon, withBase } from '@/lib/site';

import { type ContactCategory, isContactCategory, isContactSlug } from './schema';

const CONTACTS_ROOT = '/sarafan/';
const CONTACTS_MARKDOWN = '/sarafan/index.md';

export interface ContactCategoryRouteInput {
  readonly category: string;
}

export interface ContactRouteInput extends ContactCategoryRouteInput {
  readonly slug: string;
}

const contactCategory = (value: string): ContactCategory => {
  const category = value.trim();

  if (!category) {
    throw new Error('contact category is required');
  }

  if (!isContactCategory(category)) {
    throw new Error(`contact category "${value}" is invalid`);
  }

  return category;
};

const contactSlug = (value: string): string => {
  const slug = value.trim();

  if (!slug) {
    throw new Error('contact slug is required');
  }

  if (!isContactSlug(slug)) {
    throw new Error(`contact slug "${value}" is invalid`);
  }

  return slug;
};

export const contactsPath = (): string => CONTACTS_ROOT;
export const contactsMarkdownPath = (): string => CONTACTS_MARKDOWN;

export const contactCategoryPath = (input: ContactCategoryRouteInput): string =>
  `${CONTACTS_ROOT}${contactCategory(input.category)}/`;

export const contactCategoryMarkdownPath = (input: ContactCategoryRouteInput): string =>
  `${contactCategoryPath(input)}index.md`;

export const contactPath = (input: ContactRouteInput): string =>
  `${contactCategoryPath(input)}${contactSlug(input.slug)}/`;

export const contactCategoryPattern = (): string => '/sarafan/:category/';
export const contactCategoryMarkdownPattern = (): string => '/sarafan/:category/index.md';
export const contactPattern = (): string => '/sarafan/:category/:slug/';
export const contactMarkdownPattern = (): string => '/sarafan/:category/:slug/index.md';
export const contactVcfPattern = (): string => '/sarafan/:category/:slug/contact.vcf';

export const contactsUrl = (): string => withBase(contactsPath());
export const contactsMarkdownUrl = (): string => withBase(contactsMarkdownPath());

export const contactCategoryUrl = (input: ContactCategoryRouteInput): string =>
  withBase(contactCategoryPath(input));

export const contactCategoryMarkdownUrl = (input: ContactCategoryRouteInput): string =>
  withBase(contactCategoryMarkdownPath(input));

export const contactUrl = (input: ContactRouteInput): string => withBase(contactPath(input));

export const contactMarkdownUrl = (input: ContactRouteInput): string =>
  withBase(`${contactPath(input)}index.md`);

export const contactVcfUrl = (input: ContactRouteInput): string =>
  withBase(`${contactPath(input)}contact.vcf`);

export const contactCanonical = (input: ContactRouteInput): string => canon(contactPath(input));

export const contactRouteKey = (input: ContactRouteInput): string =>
  `${contactCategory(input.category)}/${contactSlug(input.slug)}`;
