import { extractFirstMarkdownText } from '@shelkovo/markdown';

import { createEntityMentionSourceRefs, type EntityMentionSourceRef } from '@/lib/mentions';

import type { EventRecord } from './types';
import { eventDayUrl } from './urls';

export const createEventMentionRefs = (event: EventRecord): readonly EntityMentionSourceRef[] => {
  if (!event.mentions.length) return [];

  return createEntityMentionSourceRefs(event.mentions, {
    source: { section: 'events', kind: 'event', id: event.id },
    title: event.title,
    htmlUrl: event.url,
    markdownUrl: `${eventDayUrl(event.startsDate)}index.md`,
    excerpt: extractFirstMarkdownText(event.body),
    mentionedAt: event.startsIso,
    sortKey: Date.parse(event.startsIso)
  });
};
