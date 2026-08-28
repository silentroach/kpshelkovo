import { extractFirstMarkdownText } from '@shelkovo/markdown';

import { createEntityMentionSourceRefs } from '@/lib/mentions';
import type { EntityMentionSourceRef } from '@/lib/mentions';

import { contactRouteKey } from './routes';
import type { Contact } from './types';

type ContactMentionRefSource = Pick<
  Contact,
  | 'body'
  | 'category'
  | 'markdownUrl'
  | 'mentions'
  | 'slug'
  | 'title'
  | 'updatedAt'
  | 'updatedIso'
  | 'url'
>;

const SPACE = /\s+/gu;

const excerpt = (markdown: string): string | undefined => {
  const first = extractFirstMarkdownText(markdown);

  return first ? first.replace(SPACE, ' ').trim() : undefined;
};

export const createContactMentionRefs = (
  contact: ContactMentionRefSource,
): readonly EntityMentionSourceRef[] => {
  if (!contact.mentions.length) {
    return [];
  }

  return createEntityMentionSourceRefs(contact.mentions, {
    source: {
      section: 'contacts',
      kind: 'contact',
      id: contactRouteKey(contact),
    },
    title: contact.title,
    htmlUrl: contact.url,
    markdownUrl: contact.markdownUrl,
    excerpt: excerpt(contact.body),
    mentionedAt: `${contact.updatedIso}T00:00:00.000Z`,
    sortKey: contact.updatedAt.valueOf(),
  });
};
