import type { PreprocessedSiteMarkdownBody } from '@/lib/markdown/render';
import type { EntityMentionTarget } from '@/lib/mentions';

import type { ContactCategory, ContactReviewSentiment } from './schema';

export interface ContactContacts {
  readonly phone?: string;
  readonly telegram?: string;
  readonly whatsapp?: string;
  readonly email?: string;
  readonly website?: string;
}

export interface ContactSeo {
  readonly description?: string;
}

export interface ContactLocation {
  readonly title: string;
  readonly url: string;
  readonly address?: string;
  readonly coordinates?: {
    readonly lat: number;
    readonly lng: number;
  };
}

export interface ContactReview {
  readonly sentiment: ContactReviewSentiment;
  readonly summary: string;
  readonly summaryHtml: string;
  readonly publishedAt: Date;
  readonly publishedIso: string;
  readonly url: string;
}

export interface ContactVcfName {
  readonly family: string;
  readonly given: string;
  readonly additional?: string;
  readonly prefix?: string;
  readonly suffix?: string;
}

interface ContactVcfBase {
  readonly downloadUrl: string;
  readonly filename: string;
  readonly fullName?: string;
  readonly phone?: string;
  readonly telegram?: string;
  readonly whatsapp?: string;
  readonly email?: string;
  readonly website?: string;
  readonly address?: string;
  readonly jobTitle?: string;
  readonly role?: string;
  readonly note?: string;
}

interface ContactPersonVcf extends ContactVcfBase {
  readonly kind: 'person';
  readonly name: ContactVcfName;
  readonly organization?: string;
}

interface ContactOrganizationVcf extends ContactVcfBase {
  readonly kind: 'organization';
  readonly organization: string;
}

export type ContactVcf = ContactPersonVcf | ContactOrganizationVcf;

interface ContactBase {
  readonly slug: string;
  readonly title: string;
  readonly category: ContactCategory;
  readonly updatedAt: Date;
  readonly updatedIso: string;
  readonly summary?: string;
  readonly searchAliases?: readonly string[];
  readonly contacts: ContactContacts;
  readonly location?: ContactLocation;
  readonly reviews: readonly ContactReview[];
  readonly seo?: ContactSeo;
  readonly vcf?: ContactVcf;
  readonly body: PreprocessedSiteMarkdownBody;
  readonly mentions: readonly EntityMentionTarget[];
}

export interface Contact extends ContactBase {
  readonly url: string;
  readonly markdownUrl: string;
  readonly canonical: string;
}

export type ContactWithVcf = Contact & { readonly vcf: ContactVcf };

export interface ContactCategoryPage {
  readonly category: ContactCategory;
  readonly contacts: readonly Contact[];
  readonly url: string;
  readonly markdownUrl: string;
}

export interface ContactsDataset {
  readonly contacts: readonly Contact[];
  readonly categories: readonly ContactCategoryPage[];
  readonly byRoute: ReadonlyMap<string, Contact>;
  readonly byCategory: ReadonlyMap<ContactCategory, ContactCategoryPage>;
}
