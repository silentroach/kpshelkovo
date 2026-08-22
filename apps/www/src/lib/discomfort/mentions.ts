import { extractFirstMarkdownText } from '@shelkovo/markdown';

import {
  createEntityMentionSourceRefs,
  type EntityMentionSourceRef,
} from '@/lib/mentions';

import { DISCOMFORT_PAGE_TITLE, DISCOMFORT_QUOTE } from './config';
import { discomfortMarkdownUrl, discomfortUrl } from './routes';
import type { DiscomfortDataset, DiscomfortEvent } from './types';

const SPACE = /\s+/gu;

const excerpt = (markdown: string): string | undefined => {
  const first = extractFirstMarkdownText(markdown);

  return first ? first.replace(SPACE, ' ').trim() : undefined;
};

const eventMentionRefs = (
  event: DiscomfortEvent,
): readonly EntityMentionSourceRef[] =>
  createEntityMentionSourceRefs(event.mentions, {
    source: {
      section: 'discomfort',
      kind: 'event',
      id: event.slug,
    },
    title: event.title,
    htmlUrl: event.url,
    markdownUrl: discomfortMarkdownUrl(),
    excerpt: excerpt(event.body),
    mentionedAt: event.dateIso,
    sortKey: Date.parse(`${event.dateIso}T00:00:00.000Z`),
  });

export const createDiscomfortMentionRefs = (
  data: DiscomfortDataset,
): readonly EntityMentionSourceRef[] => [
  ...createEntityMentionSourceRefs([data.quoteAuthor], {
    source: {
      section: 'discomfort',
      kind: 'quote',
      id: 'quote',
    },
    title: DISCOMFORT_PAGE_TITLE,
    htmlUrl: discomfortUrl(),
    markdownUrl: discomfortMarkdownUrl(),
    excerpt: DISCOMFORT_QUOTE,
    mentionedAt: '2026-02-21',
    sortKey: Date.parse('2026-02-21T00:00:00.000Z'),
  }),
  ...data.events.flatMap(eventMentionRefs),
];
