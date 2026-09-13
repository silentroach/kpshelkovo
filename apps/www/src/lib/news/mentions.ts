import { extractFirstMarkdownText } from '@shelkovo/markdown';

import { createEntityMentionSourceRefs } from '../mentions';
import type { EntityMentionSourceRef } from '../mentions';
import type { NewsArticle } from './types';

type NewsArticleMentionRefSource = Pick<
  NewsArticle,
  'id' | 'title' | 'url' | 'markdownUrl' | 'body' | 'mentions' | 'publishedIso' | 'publishedAt'
>;

export const createNewsArticleMentionRefs = (
  article: NewsArticleMentionRefSource
): readonly EntityMentionSourceRef[] => {
  if (!article.mentions.length) {
    return [];
  }

  return createEntityMentionSourceRefs(article.mentions, {
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
