import {
  preprocessSiteMarkdownContent,
  renderMarkdown,
  type PreprocessedSiteMarkdown,
} from '@/lib/markdown/render';
import type { SiteMentionRegistry } from '@/lib/mentions';

import type { ContactEntry } from './load';
import {
  contactCanonical,
  contactMarkdownUrl,
  contactUrl,
  contactVcfUrl,
} from './routes';
import type {
  Contact,
  ContactContacts,
  ContactLocation,
  ContactReview,
  ContactVcf,
} from './types';

const preprocessContactContent = (
  markdown: string,
  context: string,
  mentionRegistry?: SiteMentionRegistry,
): PreprocessedSiteMarkdown => {
  if (mentionRegistry) {
    return preprocessSiteMarkdownContent(markdown, context, mentionRegistry);
  }

  const body = markdown.trimEnd();

  return {
    markdown: body.trim() ? body : '',
    mentions: [],
  };
};

const mapContacts = (
  contacts: ContactEntry['data']['contacts'],
): ContactContacts => ({
  phone: contacts.phone,
  telegram: contacts.telegram,
  whatsapp: contacts.whatsapp,
  email: contacts.email,
  website: contacts.website,
});

const mapLocation = (
  location: ContactEntry['data']['location'],
): ContactLocation | undefined =>
  location
    ? {
        title: location.title,
        url: location.url,
        address: location.address,
        coordinates: location.coordinates,
      }
    : undefined;

const mapReviews = (
  reviews: ContactEntry['data']['reviews'],
): readonly ContactReview[] =>
  reviews?.map((review) => ({
    sentiment: review.sentiment,
    summary: review.summary,
    summaryHtml: renderMarkdown(review.summary),
    publishedAt: new Date(`${review.published_at}T00:00:00.000Z`),
    publishedIso: review.published_at,
    url: review.url,
  })) ?? [];

const mapVcf = (
  vcf: ContactEntry['data']['vcf'],
  category: string,
  slug: string,
): ContactVcf | undefined => {
  if (!vcf?.enable) {
    return;
  }

  const mapped = {
    downloadUrl: contactVcfUrl({ category, slug }),
    filename: `${slug}.vcf`,
    fullName: vcf.full_name,
    phone: vcf.phone,
    telegram: vcf.telegram,
    whatsapp: vcf.whatsapp,
    email: vcf.email,
    website: vcf.website,
    address: vcf.address,
    jobTitle: vcf.job_title,
    role: vcf.role,
    note: vcf.note,
  };

  if (vcf.kind === 'organization') {
    return {
      ...mapped,
      kind: vcf.kind,
      organization: vcf.organization,
    };
  }

  return {
    ...mapped,
    kind: vcf.kind,
    name: vcf.name,
    organization: vcf.organization,
  };
};

export const mapRawContact = (
  entry: ContactEntry,
  mentionRegistry?: SiteMentionRegistry,
): Contact => {
  const slug = entry.data.slug;
  const category = entry.data.category;
  const expectedId = `${category}/${slug}`;

  if (entry.id !== expectedId) {
    throw new Error(
      `contact "${entry.id}" id must equal category and slug "${expectedId}"`,
    );
  }

  const body = preprocessContactContent(
    entry.body?.trim() ?? '',
    `contact "${entry.id}" body`,
    mentionRegistry,
  );
  return {
    slug,
    title: entry.data.title,
    category,
    updatedAt: new Date(`${entry.data.updated_at}T00:00:00.000Z`),
    updatedIso: entry.data.updated_at,
    summary: entry.data.summary,
    searchAliases: entry.data.search_aliases,
    contacts: mapContacts(entry.data.contacts),
    location: mapLocation(entry.data.location),
    reviews: mapReviews(entry.data.reviews),
    seo: entry.data.seo,
    vcf: mapVcf(entry.data.vcf, category, slug),
    body: body.markdown,
    mentions: body.mentions,
    url: contactUrl({ category, slug }),
    markdownUrl: contactMarkdownUrl({ category, slug }),
    canonical: contactCanonical({ category, slug }),
  };
};
