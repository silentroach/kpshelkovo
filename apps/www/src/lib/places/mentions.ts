import { extractFirstMarkdownText } from '@shelkovo/markdown';

import { createEntityMentionSourceRefs } from '@/lib/mentions';
import type { EntityMentionSourceRef } from '@/lib/mentions';

import type { Place } from './types';

type PlaceMentionRefSource = Pick<
  Place,
  'body' | 'markdownUrl' | 'mentions' | 'name' | 'slug' | 'url'
>;

const SPACE = /\s+/gu;

const excerpt = (markdown: string): string | undefined => {
  const first = extractFirstMarkdownText(markdown);

  return first ? first.replace(SPACE, ' ').trim() : undefined;
};

export const createPlaceMentionRefs = (
  place: PlaceMentionRefSource,
): readonly EntityMentionSourceRef[] =>
  createEntityMentionSourceRefs(place.mentions, {
    source: {
      section: 'places',
      kind: 'place',
      id: place.slug,
    },
    title: place.name,
    htmlUrl: place.url,
    markdownUrl: place.markdownUrl,
    excerpt: excerpt(place.body),
  });
