import { extractFirstMarkdownText } from '@shelkovo/markdown';

import { createPlaceMentionTarget } from '@/lib/places/mentions';

import { createEntityMentionSourceRefs } from '../mentions';
import type { EntityMentionSourceRef } from '../mentions';
import type { NewsArticle } from './types';

type NewsArticleMentionRefSource = Pick<
  NewsArticle,
  | 'id'
  | 'title'
  | 'url'
  | 'markdownUrl'
  | 'body'
  | 'mentions'
  | 'publishedIso'
  | 'publishedAt'
  | 'events'
>;

export const createNewsArticleMentionRefs = (
  article: NewsArticleMentionRefSource
): readonly EntityMentionSourceRef[] => {
  const mentions = [
    ...article.mentions,
    ...article.events.flatMap(({ place }) =>
      place ? [createPlaceMentionTarget(place.slug, place.name, place.nameCases)] : []
    )
  ];
  if (!mentions.length) return [];
  return createEntityMentionSourceRefs(mentions, {
    source: {
      section: 'news',
      kind: 'article',
      id: article.id
    },
    title: article.title,
    htmlUrl: article.url,
    markdownUrl: article.markdownUrl,
    excerpt: extractFirstMarkdownText(article.body),
    mentionedAt: article.publishedIso,
    sortKey: article.publishedAt.valueOf()
  });
};
