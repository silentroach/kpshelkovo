import { extractFirstMarkdownText } from '@shelkovo/markdown';

import { createEntityMentionSourceRefs } from '@/lib/mentions';
import type { EntityMentionSourceRef } from '@/lib/mentions';

import { placeMarkdownUrl, placeUrl } from './routes';
import type { Place, PlaceMentionTarget, PlaceNameCaseForms } from './types';

type PlaceMentionRefSource = Pick<
  Place,
  'body' | 'markdownUrl' | 'mentions' | 'name' | 'slug' | 'url'
>;

const SPACE = /\s+/gu;

export const createPlaceMentionTarget = (
  slug: string,
  name: string,
  nameCases?: PlaceNameCaseForms,
): PlaceMentionTarget => ({
  type: 'place',
  slug,
  label: name,
  name,
  labelCases: nameCases,
  nameCases,
  htmlUrl: placeUrl(slug),
  markdownUrl: placeMarkdownUrl(slug),
});

const excerpt = (markdown: string): string | undefined => {
  const first = extractFirstMarkdownText(markdown);

  return first ? first.replace(SPACE, ' ').trim() : undefined;
};

export const createPlaceMentionRefs = (
  place: PlaceMentionRefSource,
): readonly EntityMentionSourceRef[] => {
  if (!place.mentions.length) {
    return [];
  }

  return createEntityMentionSourceRefs(place.mentions, {
    source: {
      section: 'places',
      kind: 'place',
      id: place.slug,
    },
    title: place.name,
    htmlUrl: place.url,
    markdownUrl: place.markdownUrl,
    excerpt: excerpt(place.body),
    sourceEntity: { type: 'place', slug: place.slug },
  });
};
